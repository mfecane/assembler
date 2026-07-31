import { GraphEdge } from '@/parametric/model/GraphEdge'
import {
	GraphDocumentModel,
	type ConfigurationPanelControl,
	type GraphDefinition,
	type GraphInputDefinition,
	type GraphInputValue,
	type GraphInterface,
	type GraphOutputDefinition,
} from '@/parametric/model/GraphDocumentModel'
import { GraphModel } from '@/parametric/model/GraphModel'
import {
	GraphInputGraphNode,
	GraphInstanceGraphNode,
	type GraphPoint,
} from '@/parametric/model/GraphNode'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'

export interface GraphDocument {
	entryGraphId: string
	entryInputValues: Record<string, GraphInputValue>
	graphs: GraphDefinitionDocument[]
	configurationPanel: {
		controls: ConfigurationPanelControl[]
	}
}

export interface GraphDefinitionDocument {
	id: string
	label: string
	inputs: GraphInputDefinition[]
	output: GraphOutputDefinition
	nodes: GraphDocumentNode[]
	edges: GraphDocumentEdge[]
}

export interface GraphDocumentNode {
	id: string
	name: string
	position: GraphPoint
	type: string
	data: unknown
}

export interface GraphDocumentEdge {
	id: string
	sourceNodeId: string
	targetNodeId: string
	sourcePort: string
	targetPort: string
}

export function serializeGraph(
	document: GraphDocumentModel,
	registry: NodeRegistry
): GraphDocument {
	return {
		entryGraphId: document.getEntryGraphId(),
		entryInputValues: document.getEntryInputValues(),
		graphs: document.getGraphs().map((graph) => ({
			id: graph.id,
			label: graph.label,
			inputs: graph.inputs.map(copyInput),
			output: { ...graph.output },
			nodes: graph.model.getNodes().map((node) => ({
				id: node.id,
				name: node.getName(),
				position: node.getPosition(),
				type: node.type,
				data: registry.serialize(node),
			})),
			edges: graph.model.getEdges().flatMap((edge) =>
				edge.sourcePort && edge.targetPort
					? [{
						id: edge.id,
						sourceNodeId: edge.sourceNodeId,
						targetNodeId: edge.targetNodeId,
						sourcePort: edge.sourcePort,
						targetPort: edge.targetPort,
					}]
					: []
			),
		})),
		configurationPanel: {
			controls: document.getConfigurationControls(),
		},
	}
}

export function deserializeGraph(value: unknown, registry: NodeRegistry): GraphDocumentModel {
	if (!isGraphDocument(value)) throw new Error('Unsupported graph document')

	const interfaces = new Map<string, GraphInterface>()
	for (const graph of value.graphs) {
		if (interfaces.has(graph.id)) throw new Error(`Duplicate graph ID "${graph.id}"`)
		assertUniqueInterfaceIds(graph)
		assertUniqueIds(graph)
		interfaces.set(graph.id, {
			id: graph.id,
			label: graph.label,
			inputs: graph.inputs.map(copyInput),
			output: { ...graph.output },
		})
	}

	const getGraphInterface = (graphId: string) => interfaces.get(graphId)
	const definitions: GraphDefinition[] = value.graphs.map((graph) => {
		const nodes = graph.nodes.map((serializedNode) => {
			const node = registry.deserialize(
				serializedNode.type,
				serializedNode.id,
				serializedNode.position,
				serializedNode.data
			)
			node.setName(serializedNode.name)
			return node
		})
		assertBoundaryNodes(graph, nodes)
		const edges = graph.edges.map(
			(edge) => new GraphEdge(
				edge.id,
				edge.sourceNodeId,
				edge.targetNodeId,
				edge.sourcePort,
				edge.targetPort
			)
		)
		const model = new GraphModel(registry, nodes, edges, {
			containingGraphId: graph.id,
			getGraphInterface,
		})
		if (model.getNodes().length !== graph.nodes.length || model.getEdges().length !== graph.edges.length) {
			throw new Error(`Graph "${graph.id}" contains invalid nodes, edges, or ports`)
		}
		return {
			...interfaces.get(graph.id) as GraphInterface,
			model,
		}
	})

	assertLocalAcyclicReferences(definitions)
	return new GraphDocumentModel(
		value.entryGraphId,
		definitions,
		value.entryInputValues,
		value.configurationPanel.controls
	)
}

function assertUniqueInterfaceIds(graph: GraphDefinitionDocument): void {
	const inputIds = new Set<string>()
	for (const input of graph.inputs) {
		if (inputIds.has(input.id)) {
			throw new Error(`Graph "${graph.id}" has duplicate input "${input.id}"`)
		}
		inputIds.add(input.id)
		assertInputDefinition(input, graph.id)
	}
}

function assertInputDefinition(input: GraphInputDefinition, graphId: string): void {
	if (!['number', 'enum', 'color', 'boolean', 'geometry'].includes(input.valueType)) {
		throw new Error(`Input "${input.id}" in graph "${graphId}" has an unknown value type`)
	}
	if (input.valueType === 'geometry') {
		if (input.defaultValue !== undefined) {
			throw new Error(`Geometry input "${input.id}" in graph "${graphId}" cannot have a default`)
		}
		return
	}
	if (input.defaultValue === undefined) {
		throw new Error(`Input "${input.id}" in graph "${graphId}" requires a default`)
	}
	if (input.valueType === 'number' && (
		typeof input.defaultValue !== 'number' || !Number.isFinite(input.defaultValue)
	)) {
		throw new Error(`Input "${input.id}" in graph "${graphId}" has an invalid number default`)
	}
	if (input.valueType === 'enum') {
		const options = input.options ?? []
		if (
			options.length === 0
			|| new Set(options).size !== options.length
			|| typeof input.defaultValue !== 'string'
			|| !options.includes(input.defaultValue)
		) {
			throw new Error(`Input "${input.id}" in graph "${graphId}" has an invalid enum interface`)
		}
	}
	if (input.valueType === 'color' && typeof input.defaultValue !== 'string') {
		throw new Error(`Input "${input.id}" in graph "${graphId}" has an invalid color default`)
	}
	if (input.valueType === 'boolean' && typeof input.defaultValue !== 'boolean') {
		throw new Error(`Input "${input.id}" in graph "${graphId}" has an invalid boolean default`)
	}
}

function assertUniqueIds(graph: GraphDefinitionDocument): void {
	const nodeIds = graph.nodes.map((node) => node.id)
	const edgeIds = graph.edges.map((edge) => edge.id)
	if (new Set(nodeIds).size !== nodeIds.length) {
		throw new Error(`Graph "${graph.id}" has duplicate node IDs`)
	}
	if (new Set(edgeIds).size !== edgeIds.length) {
		throw new Error(`Graph "${graph.id}" has duplicate edge IDs`)
	}
}

function isGraphDocumentNode(value: unknown): value is GraphDocumentNode {
	if (!value || typeof value !== 'object') return false
	const node = value as Partial<GraphDocumentNode>
	return typeof node.id === 'string'
		&& typeof node.name === 'string'
		&& node.name.trim().length > 0
		&& typeof node.type === 'string'
		&& Boolean(node.position)
		&& typeof node.position?.x === 'number'
		&& typeof node.position?.y === 'number'
		&& Boolean(node.data)
		&& typeof node.data === 'object'
}

function assertBoundaryNodes(
	graph: GraphDefinitionDocument,
	nodes: ReturnType<NodeRegistry['deserialize']>[]
): void {
	const outputCount = nodes.filter((node) => node.type === 'graphOutput').length
	if (outputCount !== 1) {
		throw new Error(`Graph "${graph.id}" must contain exactly one graph output`)
	}
	const inputNodes = nodes
		.filter((node): node is GraphInputGraphNode => node instanceof GraphInputGraphNode)
	for (const input of graph.inputs) {
		const count = inputNodes.filter((node) => node.getInputId() === input.id).length
		if (count !== 1) {
			throw new Error(
				`Graph "${graph.id}" requires exactly one boundary node for input "${input.id}"`
			)
		}
	}
	for (const inputId of inputNodes.map((node) => node.getInputId())) {
		if (!graph.inputs.some((input) => input.id === inputId)) {
			throw new Error(`Graph "${graph.id}" has boundary node for unknown input "${inputId}"`)
		}
	}
}

function assertLocalAcyclicReferences(graphs: GraphDefinition[]): void {
	const graphIds = new Set(graphs.map((graph) => graph.id))
	const dependencies = new Map<string, string[]>()
	for (const graph of graphs) {
		const targets = graph.model.getNodes()
			.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
			.map((node) => node.getGraphId())
		for (const target of targets) {
			if (!graphIds.has(target)) {
				throw new Error(
					`Graph "${graph.id}" references graph "${target}" outside the current document`
				)
			}
		}
		dependencies.set(graph.id, targets)
	}

	const visiting = new Set<string>()
	const visited = new Set<string>()
	const visit = (graphId: string) => {
		if (visiting.has(graphId)) throw new Error(`Recursive graph reference at "${graphId}"`)
		if (visited.has(graphId)) return
		visiting.add(graphId)
		for (const target of dependencies.get(graphId) ?? []) visit(target)
		visiting.delete(graphId)
		visited.add(graphId)
	}
	for (const graph of graphs) visit(graph.id)
}

function copyInput(input: GraphInputDefinition): GraphInputDefinition {
	return {
		...input,
		options: input.options ? [...input.options] : undefined,
	}
}

function isGraphDocument(value: unknown): value is GraphDocument {
	if (!value || typeof value !== 'object') return false
	const document = value as Partial<GraphDocument>
	return typeof document.entryGraphId === 'string'
		&& Boolean(document.entryInputValues)
		&& typeof document.entryInputValues === 'object'
		&& Array.isArray(document.graphs)
		&& Boolean(document.configurationPanel)
		&& Array.isArray(document.configurationPanel?.controls)
		&& document.graphs.every(isGraphDefinitionDocument)
}

function isGraphDefinitionDocument(value: unknown): value is GraphDefinitionDocument {
	if (!value || typeof value !== 'object') return false
	const graph = value as Partial<GraphDefinitionDocument>
	return typeof graph.id === 'string'
		&& typeof graph.label === 'string'
		&& Array.isArray(graph.inputs)
		&& Boolean(graph.output)
		&& typeof graph.output?.id === 'string'
		&& graph.output?.valueType === 'geometry'
		&& Array.isArray(graph.nodes)
		&& graph.nodes.every(isGraphDocumentNode)
		&& Array.isArray(graph.edges)
}
