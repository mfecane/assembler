import { GraphEdge } from '@/parametric/model/GraphEdge'
import type { VectorComponent } from '@/parametric/model/GraphEdge'
import {
	GraphDocumentModel,
	isInputValueCompatible,
	type ConfigurationPanelControl,
	type ConfigurationTemplate,
	type GraphDefinition,
	type GraphInputDefinition,
	type GraphInputValue,
	type GraphInterface,
	type GraphOutputDefinition,
} from '@/parametric/model/GraphDocumentModel'
import { GraphModel } from '@/parametric/model/GraphModel'
import {
	InputGraphNode,
	InputReferenceGraphNode,
	GraphInstanceGraphNode,
	type GraphPoint,
} from '@/parametric/model/GraphNode'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'
import type { EnumDefinitionSnapshot } from '@/parametric/model/EnumDefinition'
import { RootGraph } from '@/parametric/model/RootGraph'
import { Vector3Value } from '@/parametric/model/Vector3Value'
import { Client } from '@/cosntants'
import type { LayoutDataDocument } from '@/layout/LayoutDocument'
import type {
	LayoutInstanceMetadata,
	RootGraphAxisBinding,
	RootGraphLayoutMetadata,
} from '@/layout/GraphLayoutMetadata'

export interface GraphDocument {
	client: Client
	rootGraphs: RootGraphDocument[]
	enums: EnumDefinitionSnapshot[]
	graphs: GraphDefinitionDocument[]
	layout: LayoutDataDocument
}

export interface RootGraphDocument {
	graphId: string
	inputValues: Record<string, GraphInputValue>
	layoutMetadata?: RootGraphLayoutMetadata
	configurationPanel: {
		controls: ConfigurationPanelControl[]
		templates: ConfigurationTemplate[]
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
	component?: VectorComponent
}

export function serializeGraph(
	document: GraphDocumentModel,
	registry: NodeRegistry
): GraphDocument {
	return {
		client: document.getClient(),
		rootGraphs: document.getRootGraphs().map((root) => {
			const layoutMetadata = root.getLayoutMetadata()
			return {
				graphId: root.getGraphId(),
				inputValues: root.getInputValues(),
				...(layoutMetadata ? { layoutMetadata } : {}),
				configurationPanel: {
					controls: root.getConfigurationControls(),
					templates: root.getConfigurationTemplates(),
				},
			}
		}),
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
						...(edge.component ? { component: edge.component } : {}),
					}]
					: []
			),
		})),
		layout: document.getLayout(),
	}
}

export function deserializeGraph(value: unknown, registry: NodeRegistry): GraphDocumentModel {
	if (!isGraphDocument(value)) {
		const topLevelKeys = value && typeof value === 'object' ? Object.keys(value) : []
		const problems = describeDocumentShapeProblems(value)
		throw new Error(
			'Unsupported graph document. '
			+ `Invalid paths: ${problems.join(' | ')}. `
			+ `Received ${typeof value} with top-level keys ${JSON.stringify(topLevelKeys)}. `
			+ 'This project schema has no legacy compatibility; reset persisted project data and reseed it.'
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
		assertBoundaryNodes(graph, nodes, enumDefinitions)
		const edges = graph.edges.map(
			(edge) => new GraphEdge(
				edge.id,
				edge.sourceNodeId,
				edge.targetNodeId,
				edge.sourcePort,
				edge.targetPort,
				edge.component
			)
		)
		const model = new GraphModel(registry, nodes, edges, {
			containingGraphId: graph.id,
			getGraphInterface,
			getEnumOptions: (enumId) => enumDefinitions.get(enumId)?.options ?? [],
		})
		if (model.getNodes().length !== graph.nodes.length || model.getEdges().length !== graph.edges.length) {
			const acceptedNodeIds = new Set(model.getNodes().map((node) => node.id))
			const acceptedEdgeIds = new Set(model.getEdges().map((edge) => edge.id))
			const rejectedNodeIds = graph.nodes
				.filter((node) => !acceptedNodeIds.has(node.id))
				.map((node) => `${node.id} (${node.type})`)
			const rejectedEdges = graph.edges
				.filter((edge) => !acceptedEdgeIds.has(edge.id))
				.map((edge) => (
					`${edge.id}: ${edge.sourceNodeId}.${edge.sourcePort} -> `
					+ `${edge.targetNodeId}.${edge.targetPort}`
				))
			throw new Error(
				`Graph "${graph.id}" contains invalid nodes, edges, or ports. `
				+ `Rejected nodes: ${JSON.stringify(rejectedNodeIds)}. `
				+ `Rejected or replaced edges: ${JSON.stringify(rejectedEdges)}. `
				+ `Expected ${graph.nodes.length} nodes and ${graph.edges.length} edges; accepted `
				+ `${model.getNodes().length} nodes and ${model.getEdges().length} edges.`
			)
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
		root.configurationPanel.templates,
		root.layoutMetadata
	))
	const document = new GraphDocumentModel(
		value.client,
		rootGraphs,
		value.enums,
		definitions,
		value.layout
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

function describeDocumentShapeProblems(value: unknown): string[] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return ['$: expected an object']
	}
	const document = value as Record<string, unknown>
	const problems: string[] = []
	if (!Object.values(Client).includes(document.client as Client)) {
		problems.push('$.client: expected "maxshelf" or "kitchen"')
	}
	if (!Array.isArray(document.rootGraphs) || document.rootGraphs.length === 0) {
		problems.push('$.rootGraphs: expected a non-empty array')
	} else {
		document.rootGraphs.forEach((root, index) => {
			if (isRootGraphDocument(root)) return
			if (!root || typeof root !== 'object' || Array.isArray(root)) {
				problems.push(`$.rootGraphs[${index}]: expected an object`)
				return
			}
			const candidate = root as Record<string, unknown>
			const panel = candidate.configurationPanel
			if (typeof candidate.graphId !== 'string') {
				problems.push(`$.rootGraphs[${index}].graphId: expected a string`)
			}
			if (!candidate.inputValues || typeof candidate.inputValues !== 'object') {
				problems.push(`$.rootGraphs[${index}].inputValues: expected an object`)
			}
			if (!isRootGraphLayoutMetadata(candidate.layoutMetadata)) {
				problems.push(`$.rootGraphs[${index}].layoutMetadata: expected optional axis bindings`)
			}
			if (!panel || typeof panel !== 'object' || Array.isArray(panel)) {
				problems.push(`$.rootGraphs[${index}].configurationPanel: expected an object`)
			} else {
				const configurationPanel = panel as Record<string, unknown>
				if (!Array.isArray(configurationPanel.controls)) {
					problems.push(`$.rootGraphs[${index}].configurationPanel.controls: expected an array`)
				}
				if (!Array.isArray(configurationPanel.templates)) {
					problems.push(`$.rootGraphs[${index}].configurationPanel.templates: expected an array`)
				}
				if ('constraints' in configurationPanel) {
					problems.push(`$.rootGraphs[${index}].configurationPanel.constraints: obsolete property`)
				}
			}
		})
	}
	if (!Array.isArray(document.enums)) problems.push('$.enums: expected an array')
	if (!Array.isArray(document.graphs)) {
		problems.push('$.graphs: expected an array')
	} else {
		document.graphs.forEach((graph, index) => {
			if (!isGraphDefinitionDocument(graph)) {
				problems.push(`$.graphs[${index}]: invalid graph definition`)
			}
		})
	}
	if (!isLayoutDataDocument(document.layout)) {
		const layout = document.layout
		if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
			problems.push('$.layout: expected an object')
		} else {
			const candidate = layout as Record<string, unknown>
			if ('activeLayoutId' in candidate) {
				problems.push('$.layout.activeLayoutId: obsolete; expected activeProductId')
			}
			if (typeof candidate.activeProductId !== 'string') {
				problems.push('$.layout.activeProductId: expected a string')
			}
			if (!Array.isArray(candidate.layouts) || candidate.layouts.length === 0) {
				problems.push('$.layout.layouts: expected a non-empty array')
			} else {
				candidate.layouts.forEach((item, index) => {
					if (item && typeof item === 'object' && 'slotIds' in item) {
						problems.push(`$.layout.layouts[${index}].slotIds: obsolete; expected slotId and slotsCount`)
					} else if (item && typeof item === 'object' && 'instances' in item) {
						problems.push(`$.layout.layouts[${index}].instances: obsolete; move items to $.layout.products[*].instances`)
					} else if (
						item
						&& typeof item === 'object'
						&& typeof (item as Record<string, unknown>).configurationHeader !== 'string'
					) {
						problems.push(`$.layout.layouts[${index}].configurationHeader: expected a string`)
					} else if (!item || typeof item !== 'object') {
						problems.push(`$.layout.layouts[${index}]: expected a layout definition object`)
					}
				})
			}
			if (!Array.isArray(candidate.products) || candidate.products.length === 0) {
				problems.push('$.layout.products: expected a non-empty product array')
			} else {
				candidate.products.forEach((item, index) => {
					if (!item || typeof item !== 'object' || Array.isArray(item)) {
						problems.push(`$.layout.products[${index}]: expected a product object`)
						return
					}
					const product = item as Record<string, unknown>
					if (typeof product.layoutId !== 'string') {
						problems.push(`$.layout.products[${index}].layoutId: expected a string`)
					}
					if (!Array.isArray(product.instances)) {
						problems.push(`$.layout.products[${index}].instances: expected an array`)
					}
				})
			}
			if (!Array.isArray(candidate.slots) || candidate.slots.length === 0) {
				problems.push('$.layout.slots: expected a non-empty slot-definition array')
			} else {
				candidate.slots.forEach((item, index) => {
					if (item && typeof item === 'object' && ('graphId' in item || 'inputValues' in item)) {
						problems.push(`$.layout.slots[${index}]: obsolete graph instance; expected graphs and instanceBounds`)
					}
				})
			}
		}
	}
	return problems.length > 0 ? problems : ['$: one or more nested values have invalid types']
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
	if (!['number', 'numberArray', 'vector3', 'enum', 'materialInstance', 'color', 'boolean', 'geometry'].includes(input.valueType)) {
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
	if (input.valueType === 'numberArray' && (
		!Array.isArray(input.defaultValue)
		|| input.defaultValue.some((item) => !Number.isFinite(item) || item < 0)
	)) {
		throw new Error(
			`Input "${input.id}" in graph "${graphId}" requires an array of non-negative finite `
			+ `numbers as its default. Received ${JSON.stringify(input.defaultValue)}.`
		)
	}
	if (input.valueType === 'vector3' && !Vector3Value.isSnapshot(input.defaultValue)) {
		throw new Error(
			`Vector 3 input "${input.id}" in graph "${graphId}" requires finite x, y, and z defaults. `
			+ `Received ${JSON.stringify(input.defaultValue)}.`
		)
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
			|| !Number.isInteger(input.defaultValue)
			|| (input.defaultValue as number) < 0
			|| (input.defaultValue as number) >= options.length
		) {
			throw new Error(
				`Choice input "${input.id}" in graph "${graphId}" must reference one document choice set `
				+ `through enumId, must not define local options, and must use a valid option index. `
				+ `Received enumId ${JSON.stringify(input.enumId)}, default `
				+ `${JSON.stringify(input.defaultValue)}, local options ${JSON.stringify(localOptions)}.`
			)
		}
	}
	if (input.valueType === 'materialInstance' && (
		typeof input.defaultValue !== 'string' || !input.defaultValue.trim()
	)) {
		throw new Error(
			`Material input "${input.id}" in graph "${graphId}" requires a non-empty material ID `
			+ `as its default. Received ${JSON.stringify(input.defaultValue)}.`
		)
	}
	if (input.valueType === 'color' && (
		typeof input.defaultValue !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(input.defaultValue)
	)) {
		throw new Error(
			`Color input "${input.id}" in graph "${graphId}" requires a six-digit hex default. `
			+ `Received ${JSON.stringify(input.defaultValue)}.`
		)
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
	nodes: ReturnType<NodeRegistry['deserialize']>[],
	enumDefinitions: ReadonlyMap<string, EnumDefinitionSnapshot>
): void {
	const outputCount = nodes.filter((node) => node.type === 'graphOutput').length
	if (outputCount !== 1) {
		throw new Error(`Graph "${graph.id}" must contain exactly one graph output`)
	}
	const inputNodes = nodes.filter((node): node is InputGraphNode => node instanceof InputGraphNode)
	for (const node of inputNodes) {
		if (node.getValueType() !== 'enum') continue
		const definition = enumDefinitions.get(node.getEnumId() ?? '')
		const value = node.getValue()
		if (!definition || typeof value !== 'number' || value >= definition.options.length) {
			throw new Error(
				`Graph "${graph.id}" Input node "${node.id}" has invalid choice value `
				+ `${JSON.stringify(value)} for choice set ${JSON.stringify(node.getEnumId())}.`
			)
		}
	}
	for (const node of nodes) {
		if (!(node instanceof InputReferenceGraphNode)) continue
		const input = graph.inputs.find((candidate) => candidate.id === node.getInputId())
		if (!input) {
			throw new Error(
				`Graph "${graph.id}" Input Reference node "${node.id}" references missing graph input `
				+ `"${node.getInputId()}". Available input IDs: ${JSON.stringify(graph.inputs.map(
					(candidate) => candidate.id
				))}.`
			)
		}
	}
	for (const input of graph.inputs) {
		const node = inputNodes.find((candidate) => candidate.id === input.id)
		if (
			!node
			|| !node.isExported()
			|| node.getValueType() !== input.valueType
			|| node.getEnumId() !== input.enumId
			|| JSON.stringify(node.getValue()) !== JSON.stringify(input.defaultValue)
		) {
			throw new Error(
				`Graph "${graph.id}" input "${input.id}" must match one exported Input node. `
				+ `Input definition: ${JSON.stringify(input)}.`
			)
		}
	}
	for (const node of inputNodes) {
		if (node.isExported() && !graph.inputs.some((input) => input.id === node.id)) {
			throw new Error(`Graph "${graph.id}" has exported Input node "${node.id}" without a graph input`)
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
	if (input.defaultValue === undefined) return { ...input }
	if (Array.isArray(input.defaultValue)) return { ...input, defaultValue: [...input.defaultValue] }
	return Vector3Value.isSnapshot(input.defaultValue)
		? { ...input, defaultValue: { ...input.defaultValue } }
		: { ...input }
}

function isGraphDocument(value: unknown): value is GraphDocument {
	if (!value || typeof value !== 'object') return false
	const document = value as Partial<GraphDocument>
	return Object.values(Client).includes(document.client as Client)
		&& Array.isArray(document.rootGraphs)
		&& document.rootGraphs.length > 0
		&& document.rootGraphs.every(isRootGraphDocument)
		&& Array.isArray(document.enums)
		&& Array.isArray(document.graphs)
		&& document.graphs.every(isGraphDefinitionDocument)
		&& isLayoutDataDocument(document.layout)
}

function isLayoutDataDocument(value: unknown): value is LayoutDataDocument {
	if (!value || typeof value !== 'object') return false
	const layout = value as Partial<LayoutDataDocument>
	return typeof layout.activeProductId === 'string'
		&& layout.activeProductId.length > 0
		&& Array.isArray(layout.layouts)
		&& layout.layouts.length > 0
		&& layout.layouts.every((item) => {
			if (!item || typeof item !== 'object') return false
			return typeof item.id === 'string'
				&& typeof item.label === 'string'
				&& typeof item.configurationHeader === 'string'
				&& item.configurationHeader.length > 0
				&& (item.type === 'row' || item.type === 'single')
				&& (item.type !== 'row' || item.axis === 'x')
				&& (item.type !== 'single' || !('axis' in item))
				&& typeof item.slotId === 'string'
				&& isLayoutRange(item.slotsCount)
		})
		&& Array.isArray(layout.products)
		&& layout.products.length > 0
		&& layout.products.every((product) => (
			Boolean(product)
			&& typeof product === 'object'
			&& typeof product.id === 'string'
			&& typeof product.label === 'string'
			&& typeof product.layoutId === 'string'
			&& Array.isArray(product.instances)
			&& product.instances.every((instance) => (
					Boolean(instance)
					&& typeof instance === 'object'
					&& typeof instance.id === 'string'
					&& typeof instance.graphId === 'string'
					&& Boolean(instance.inputValues)
					&& typeof instance.inputValues === 'object'
					&& !Array.isArray(instance.inputValues)
					&& Object.values(instance.inputValues).every(isGraphInputValue)
					&& isLayoutInstanceMetadata(instance.layoutMetadata)
				))
		))
		&& Array.isArray(layout.slots)
		&& layout.slots.length > 0
		&& layout.slots.every((slot) => (
			Boolean(slot)
			&& typeof slot === 'object'
			&& typeof slot.id === 'string'
			&& typeof slot.label === 'string'
			&& Array.isArray(slot.graphs)
			&& slot.graphs.every((graphId) => typeof graphId === 'string')
			&& Boolean(slot.instanceBounds)
			&& isLayoutRange(slot.instanceBounds.width)
			&& isLayoutRange(slot.instanceBounds.depth)
			&& isLayoutRange(slot.instanceBounds.height)
		))
}

function isLayoutRange(value: unknown): value is { min: number; max: number } {
	if (!value || typeof value !== 'object') return false
	const range = value as { min?: unknown; max?: unknown }
	return typeof range.min === 'number' && typeof range.max === 'number'
}

function isRootGraphDocument(value: unknown): value is RootGraphDocument {
	if (!value || typeof value !== 'object') return false
	const root = value as Partial<RootGraphDocument>
	return typeof root.graphId === 'string'
		&& root.graphId.length > 0
		&& Boolean(root.inputValues)
		&& typeof root.inputValues === 'object'
		&& !Array.isArray(root.inputValues)
		&& Object.values(root.inputValues).every(isGraphInputValue)
		&& isRootGraphLayoutMetadata(root.layoutMetadata)
		&& Boolean(root.configurationPanel)
		&& !('constraints' in (root.configurationPanel as object))
		&& Array.isArray(root.configurationPanel?.controls)
		&& root.configurationPanel.controls.every(isConfigurationPanelControl)
		&& Array.isArray(root.configurationPanel.templates)
		&& root.configurationPanel.templates.every(isConfigurationTemplate)
}

function isConfigurationTemplate(value: unknown): value is ConfigurationTemplate {
	if (!value || typeof value !== 'object') return false
	const template = value as Partial<ConfigurationTemplate>
	return typeof template.id === 'string'
		&& template.id.trim().length > 0
		&& typeof template.label === 'string'
		&& template.label.trim().length > 0
		&& Boolean(template.values)
		&& typeof template.values === 'object'
		&& !Array.isArray(template.values)
		&& Object.values(template.values).every(isGraphInputValue)
}

function isGraphInputValue(value: unknown): value is GraphInputValue {
	return typeof value === 'number'
		|| typeof value === 'string'
		|| typeof value === 'boolean'
		|| (Array.isArray(value) && value.every((item) => typeof item === 'number'))
		|| Vector3Value.isSnapshot(value)
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
	if (control.type === 'numberArray') {
		return Array.isArray(control.labels)
			&& control.labels.every((label) => typeof label === 'string')
			&& typeof control.total === 'number'
			&& Number.isFinite(control.total)
			&& typeof control.step === 'number'
			&& Number.isFinite(control.step)
	}
	return control.type === 'select' || control.type === 'material' || control.type === 'switch'
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

function isLayoutInstanceMetadata(value: unknown): value is LayoutInstanceMetadata | undefined {
	if (value === undefined) return true
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const metadata = value as Partial<LayoutInstanceMetadata>
	if (!metadata.axisBinding || typeof metadata.axisBinding !== 'object' || Array.isArray(metadata.axisBinding)) {
		return false
	}
	const bindings = metadata.axisBinding as Record<string, unknown>
	return Object.keys(bindings).every((role) => (
		['primary', 'secondary', 'tertiary'].includes(role)
		&& typeof bindings[role] === 'string'
		&& (bindings[role] as string).length > 0
	))
}

function isRootGraphLayoutMetadata(value: unknown): value is RootGraphLayoutMetadata | undefined {
	if (value === undefined) return true
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const metadata = value as Partial<RootGraphLayoutMetadata>
	if (!metadata.axisBinding || typeof metadata.axisBinding !== 'object' || Array.isArray(metadata.axisBinding)) {
		return false
	}
	const bindings = metadata.axisBinding as Record<string, unknown>
	return Object.keys(bindings).every((role) => {
		const binding = bindings[role]
		return ['primary', 'secondary', 'tertiary'].includes(role)
			&& Boolean(binding)
			&& typeof binding === 'object'
			&& !Array.isArray(binding)
			&& typeof (binding as RootGraphAxisBinding).inputId === 'string'
			&& (binding as RootGraphAxisBinding).inputId.length > 0
			&& (
				(binding as RootGraphAxisBinding).component === undefined
				|| ['x', 'y', 'z'].includes((binding as RootGraphAxisBinding).component as string)
			)
	})
}
