import { GraphEdge } from '@/parametric/model/GraphEdge'
import {
	GraphDocumentModel,
	isInputValueCompatible,
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
import { isRgbColor } from '@/parametric/model/ColorPalette'
import type { ConfigurationConstraintDefinition } from '@/parametric/model/ConfigurationConstraint'
import type { EnumDefinitionSnapshot } from '@/parametric/model/EnumDefinition'
import { RootGraph } from '@/parametric/model/RootGraph'

export interface GraphDocument {
	rootGraphs: RootGraphDocument[]
	enums: EnumDefinitionSnapshot[]
	graphs: GraphDefinitionDocument[]
}

export interface RootGraphDocument {
	graphId: string
	inputValues: Record<string, GraphInputValue>
	configurationPanel: {
		controls: ConfigurationPanelControl[]
		constraints: ConfigurationConstraintDefinition[]
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
		rootGraphs: document.getRootGraphs().map((root) => ({
			graphId: root.getGraphId(),
			inputValues: root.getInputValues(),
			configurationPanel: {
				controls: root.getConfigurationControls(),
				constraints: root.getConfigurationConstraints().map(
					(constraint) => constraint.toDefinition()
				),
			},
		})),
		enums: document.getEnumDefinitions(),
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
	}
}

export function deserializeGraph(value: unknown, registry: NodeRegistry): GraphDocumentModel {
	if (!isGraphDocument(value)) {
		const topLevelKeys = value && typeof value === 'object' ? Object.keys(value) : []
		throw new Error(
			'Unsupported graph document. Expected rootGraphs, enums, and graphs. Each rootGraphs item '
			+ 'must contain graphId, inputValues, and configurationPanel with controls and constraints. '
			+ `Received ${typeof value} with top-level keys ${JSON.stringify(topLevelKeys)}.`
		)
	}
	assertEnumDefinitions(value.enums)
	const enumDefinitions = new Map(value.enums.map((definition) => [definition.id, definition]))

	const interfaces = new Map<string, GraphInterface>()
	for (const graph of value.graphs) {
		if (interfaces.has(graph.id)) throw new Error(`Duplicate graph ID "${graph.id}"`)
		assertUniqueInterfaceIds(graph, enumDefinitions)
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
			getEnumOptions: (enumId) => enumDefinitions.get(enumId)?.options ?? [],
		})
		if (model.getNodes().length !== graph.nodes.length || model.getEdges().length !== graph.edges.length) {
			throw new Error(`Graph "${graph.id}" contains invalid nodes, edges, or ports`)
		}
		return {
			...interfaces.get(graph.id) as GraphInterface,
			model,
		}
	})

	assertLocalAcyclicReferences(definitions, enumDefinitions)
	const rootGraphs = value.rootGraphs.map((root) => new RootGraph(
		root.graphId,
		root.inputValues,
		root.configurationPanel.controls,
		root.configurationPanel.constraints
	))
	const document = new GraphDocumentModel(
		rootGraphs,
		value.enums,
		definitions
	)
	for (const graph of document.getGraphs()) {
		graph.model.setPortContext({
			containingGraphId: graph.id,
			getGraphInterface: (graphId) => document.getGraphInterface(graphId),
			getEnumOptions: (enumId) => document.getEnumOptions(enumId),
		})
	}
	return document
}

function assertUniqueInterfaceIds(
	graph: GraphDefinitionDocument,
	enumDefinitions: ReadonlyMap<string, EnumDefinitionSnapshot>
): void {
	const inputIds = new Set<string>()
	for (const input of graph.inputs) {
		if (inputIds.has(input.id)) {
			throw new Error(`Graph "${graph.id}" has duplicate input "${input.id}"`)
		}
		inputIds.add(input.id)
		assertInputDefinition(input, graph.id, enumDefinitions)
	}
}

function assertInputDefinition(
	input: GraphInputDefinition,
	graphId: string,
	enumDefinitions: ReadonlyMap<string, EnumDefinitionSnapshot>
): void {
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
		const definition = enumDefinitions.get(input.enumId ?? '')
		const options = definition?.options ?? []
		const localOptions = 'options' in input
			? (input as GraphInputDefinition & { options?: unknown }).options
			: undefined
		if (
			!definition
			|| localOptions !== undefined
			|| typeof input.defaultValue !== 'string'
			|| !options.includes(input.defaultValue)
		) {
			throw new Error(
				`Choice input "${input.id}" in graph "${graphId}" must reference one document choice set `
				+ `through enumId, must not define local options, and must use a default from that choice set. `
				+ `Received enumId ${JSON.stringify(input.enumId)}, default `
				+ `${JSON.stringify(input.defaultValue)}, local options ${JSON.stringify(localOptions)}.`
			)
		}
	}
	if (input.valueType === 'color') {
		const localOptions = 'options' in input
			? (input as GraphInputDefinition & { options?: unknown }).options
			: undefined
		if (
			localOptions !== undefined
			|| typeof input.defaultValue !== 'string'
			|| !isRgbColor(input.defaultValue)
		) {
			throw new Error(
				`Color input "${input.id}" in graph "${graphId}" requires a #RRGGBB default `
				+ 'and must not define local options; available colors belong to its configuration control. '
				+ `Received default ${JSON.stringify(input.defaultValue)} and local options `
				+ `${JSON.stringify(localOptions)}.`
			)
		}
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

function assertLocalAcyclicReferences(
	graphs: GraphDefinition[],
	enumDefinitions: ReadonlyMap<string, EnumDefinitionSnapshot>
): void {
	const graphsById = new Map(graphs.map((graph) => [graph.id, graph]))
	const dependencies = new Map<string, string[]>()
	for (const graph of graphs) {
		const instances = graph.model.getNodes()
			.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
		for (const instance of instances) {
			const target = graphsById.get(instance.getGraphId())
			if (!target) {
				throw new Error(
					`Graph "${graph.id}" instance "${instance.id}" references unknown graph `
					+ `"${instance.getGraphId()}"`
				)
			}
			for (const [inputId, value] of Object.entries(instance.getInputValues())) {
				const input = target.inputs.find((candidate) => candidate.id === inputId)
				if (!input) {
					throw new Error(
						`Graph "${graph.id}" instance "${instance.id}" stores a value for unknown `
						+ `input "${inputId}" on graph "${target.id}"`
					)
				}
				const options = input.valueType === 'enum'
					? enumDefinitions.get(input.enumId ?? '')?.options ?? []
					: []
				if (!isInputValueCompatible(input, value, options)) {
					throw new Error(
						`Graph "${graph.id}" instance "${instance.id}" has an incompatible value `
						+ `for ${input.valueType} input "${inputId}" on graph "${target.id}"`
					)
				}
			}
		}
		dependencies.set(graph.id, instances.map((instance) => instance.getGraphId()))
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
	return { ...input }
}

function isGraphDocument(value: unknown): value is GraphDocument {
	if (!value || typeof value !== 'object') return false
	const document = value as Partial<GraphDocument>
	return Array.isArray(document.rootGraphs)
		&& document.rootGraphs.length > 0
		&& document.rootGraphs.every(isRootGraphDocument)
		&& Array.isArray(document.enums)
		&& Array.isArray(document.graphs)
		&& document.graphs.every(isGraphDefinitionDocument)
}

function isRootGraphDocument(value: unknown): value is RootGraphDocument {
	if (!value || typeof value !== 'object') return false
	const root = value as Partial<RootGraphDocument>
	return typeof root.graphId === 'string'
		&& root.graphId.length > 0
		&& Boolean(root.inputValues)
		&& typeof root.inputValues === 'object'
		&& !Array.isArray(root.inputValues)
		&& Object.values(root.inputValues).every((inputValue) => (
			typeof inputValue === 'number'
			|| typeof inputValue === 'string'
			|| typeof inputValue === 'boolean'
		))
		&& Boolean(root.configurationPanel)
		&& Array.isArray(root.configurationPanel?.controls)
		&& root.configurationPanel.controls.every(isConfigurationPanelControl)
		&& Array.isArray(root.configurationPanel?.constraints)
		&& root.configurationPanel.constraints.every(isConfigurationConstraintDefinition)
}

function isConfigurationPanelControl(value: unknown): value is ConfigurationPanelControl {
	if (!value || typeof value !== 'object') return false
	const control = value as Record<string, unknown>
	if (
		typeof control.id !== 'string'
		|| !control.id
		|| typeof control.inputId !== 'string'
		|| !control.inputId
		|| typeof control.label !== 'string'
	) {
		return false
	}
	if (control.type === 'number') {
		return typeof control.step === 'number' && Number.isFinite(control.step)
	}
	if (control.type === 'slider') {
		return typeof control.min === 'number'
			&& Number.isFinite(control.min)
			&& typeof control.max === 'number'
			&& Number.isFinite(control.max)
			&& typeof control.step === 'number'
			&& Number.isFinite(control.step)
	}
	if (control.type === 'color') {
		return Array.isArray(control.options)
			&& control.options.every((option) => typeof option === 'string')
	}
	return control.type === 'select' || control.type === 'switch'
}

function assertEnumDefinitions(definitions: EnumDefinitionSnapshot[]): void {
	const ids = new Set<string>()
	for (const definition of definitions) {
		if (
			!definition
			|| typeof definition !== 'object'
			|| typeof definition.id !== 'string'
			|| !definition.id
			|| definition.id.trim() !== definition.id
			|| typeof definition.name !== 'string'
			|| !definition.name
			|| definition.name.trim() !== definition.name
			|| !Array.isArray(definition.options)
			|| definition.options.length === 0
			|| definition.options.some((option) => (
				typeof option !== 'string' || option.trim() !== option || !option
			))
			|| new Set(definition.options).size !== definition.options.length
		) {
			throw new Error(`Invalid document choice-set definition: ${JSON.stringify(definition)}`)
		}
		if (ids.has(definition.id)) throw new Error(`Duplicate choice-set ID "${definition.id}"`)
		ids.add(definition.id)
	}
}

function isConfigurationConstraintDefinition(
	value: unknown
): value is ConfigurationConstraintDefinition {
	if (!value || typeof value !== 'object') return false
	const constraint = value as Partial<ConfigurationConstraintDefinition>
	return constraint.type === 'sumMaximumByEnum'
		&& Array.isArray(constraint.inputIds)
		&& constraint.inputIds.every((inputId) => typeof inputId === 'string')
		&& typeof constraint.selectorInputId === 'string'
		&& Boolean(constraint.maximums)
		&& typeof constraint.maximums === 'object'
		&& Object.values(constraint.maximums).every((maximum) => typeof maximum === 'number')
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
