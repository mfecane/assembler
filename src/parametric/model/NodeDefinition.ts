import type {
	GraphInputDefault,
	GraphInputPort,
	GraphNode,
	GraphOutputPort,
	GraphPoint,
	GraphValueType,
} from '@/parametric/model/GraphNode'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type {
	EvaluatedNodeOutputs,
	GraphValue,
	NodeEvaluationContext,
} from '@/parametric/evaluation/EvaluationTypes'
import type { GraphInterface } from '@/parametric/model/GraphDocumentModel'

export interface NodeCreationContext {
	meshCatalog: MeshCatalog
}

export interface NodePortContext {
	containingGraphId: string
	getGraphInterface(graphId: string): GraphInterface | undefined
}

export interface NodePortDefinition<TNode extends GraphNode> {
	inputs?:
		| readonly GraphInputPort[]
		| ((node: TNode, context?: NodePortContext) => readonly GraphInputPort[])
	outputs?:
		| readonly GraphOutputPort[]
		| ((node: TNode, context?: NodePortContext) => readonly GraphOutputPort[])
	getInputDefault?: (node: TNode, portId: string) => GraphInputDefault | undefined
	getOutputOptions?: (
		node: TNode,
		portId: string,
		context?: NodePortContext
	) => readonly string[] | undefined
}

export interface NumericFieldDefinition<TNode extends GraphNode> {
	get(node: TNode): number
	set(node: TNode, value: number): void
}

export interface NodeCapabilityDefinition<TNode extends GraphNode = GraphNode> {
	id: string
	getState(node: TNode): unknown
	serialize(node: TNode): unknown
	deserialize(node: TNode, value: unknown, context: string): void
	numericFields?: Record<string, NumericFieldDefinition<TNode>>
	applyOutputs?: (node: TNode, outputs: EvaluatedNodeOutputs) => EvaluatedNodeOutputs
}

export interface NodeDefinition<TNode extends GraphNode = GraphNode> {
	type: string
	label: string
	creatable: boolean
	create?: (id: string, position: GraphPoint, context: NodeCreationContext) => TNode
	ports: NodePortDefinition<TNode>
	capabilities?: readonly NodeCapabilityDefinition<TNode>[]
	isOutput?: boolean
	syncInputPorts?: (node: TNode, connectedPortIds: ReadonlySet<string>) => void
	numericFields?: Record<string, NumericFieldDefinition<TNode>>
	serialize(node: TNode): unknown
	deserialize(id: string, position: GraphPoint, data: unknown): TNode
	evaluate?: (node: TNode, context: NodeEvaluationContext) => EvaluatedNodeOutputs
}

export interface CreatableNodeDefinition {
	type: string
	label: string
}

export interface GraphValueTypeDefinition {
	id: GraphValueType
	connectionMode: 'single' | 'aggregate'
	aggregate?: (values: readonly GraphValue[]) => GraphValue
}

export class NodeRegistry {
	private readonly definitions = new Map<string, NodeDefinition>()
	private readonly valueTypes = new Map<string, GraphValueTypeDefinition>([
		['geometry', {
			id: 'geometry',
			connectionMode: 'aggregate',
			aggregate: (values) => ({
				valueType: 'geometry',
				value: values.flatMap((value) => Array.isArray(value.value) ? value.value : []),
			}),
		}],
		['number', { id: 'number', connectionMode: 'single' }],
		['enum', { id: 'enum', connectionMode: 'single' }],
		['color', { id: 'color', connectionMode: 'single' }],
	])

	public registerValueType(definition: GraphValueTypeDefinition): this {
		if (this.valueTypes.has(definition.id)) {
			throw new Error(`Graph value type "${definition.id}" is already registered`)
		}
		if (definition.connectionMode === 'aggregate' && !definition.aggregate) {
			throw new Error(`Aggregate graph value type "${definition.id}" requires an aggregate function`)
		}
		this.valueTypes.set(definition.id, definition)
		return this
	}

	public register<TNode extends GraphNode>(definition: NodeDefinition<TNode>): this {
		if (this.definitions.has(definition.type)) {
			throw new Error(`Node type "${definition.type}" is already registered`)
		}
		const capabilityIds = definition.capabilities?.map((capability) => capability.id) ?? []
		if (new Set(capabilityIds).size !== capabilityIds.length) {
			throw new Error(`Node type "${definition.type}" declares duplicate capabilities`)
		}
		this.definitions.set(definition.type, definition as unknown as NodeDefinition)
		return this
	}

	public getDefinition(type: string): NodeDefinition | undefined {
		return this.definitions.get(type)
	}

	public getCreatableDefinitions(): CreatableNodeDefinition[] {
		return [...this.definitions.values()]
			.filter((definition) => definition.creatable && definition.create)
			.map(({ type, label }) => ({ type, label }))
	}

	public create(type: string, id: string, position: GraphPoint, context: NodeCreationContext): GraphNode | undefined {
		return this.definitions.get(type)?.create?.(id, position, context)
	}

	public getInputPorts(node: GraphNode, context?: NodePortContext): readonly GraphInputPort[] {
		const inputs = this.requireDefinition(node.type).ports.inputs
		if (!inputs) return []
		return typeof inputs === 'function' ? inputs(node, context) : inputs
	}

	public getOutputPorts(node: GraphNode, context?: NodePortContext): readonly GraphOutputPort[] {
		const outputs = this.requireDefinition(node.type).ports.outputs
		if (!outputs) return []
		return typeof outputs === 'function' ? outputs(node, context) : outputs
	}

	public getInputDefault(node: GraphNode, portId: string): GraphInputDefault | undefined {
		return this.requireDefinition(node.type).ports.getInputDefault?.(node, portId)
	}

	public getOutputOptions(
		node: GraphNode,
		portId: string,
		context?: NodePortContext
	): readonly string[] | undefined {
		return this.requireDefinition(node.type).ports.getOutputOptions?.(node, portId, context)
	}

	public isOutput(node: GraphNode): boolean {
		return this.requireDefinition(node.type).isOutput ?? false
	}

	public syncInputPorts(node: GraphNode, connectedPortIds: ReadonlySet<string>): void {
		this.requireDefinition(node.type).syncInputPorts?.(node, connectedPortIds)
	}

	public hasDynamicInputPorts(node: GraphNode): boolean {
		return Boolean(this.requireDefinition(node.type).syncInputPorts)
	}

	public getNumericValue(node: GraphNode, field: string): number | undefined {
		for (const capability of this.getCapabilities(node)) {
			const value = capability.numericFields?.[field]?.get(node)
			if (value !== undefined) return value
		}
		return this.requireDefinition(node.type).numericFields?.[field]?.get(node)
	}

	public setNumericValue(node: GraphNode, field: string, value: number): boolean {
		for (const capability of this.getCapabilities(node)) {
			const numericField = capability.numericFields?.[field]
			if (!numericField) continue
			numericField.set(node, Number.isFinite(value) ? value : 0)
			return true
		}
		const numericField = this.requireDefinition(node.type).numericFields?.[field]
		if (!numericField) return false
		numericField.set(node, Number.isFinite(value) ? value : 0)
		return true
	}

	public serialize(node: GraphNode): unknown {
		return this.requireDefinition(node.type).serialize(node)
	}

	public serializeCapabilities(node: GraphNode): Record<string, unknown> {
		return Object.fromEntries(
			this.getCapabilities(node).map((capability) => [capability.id, capability.serialize(node)])
		)
	}

	public deserialize(
		type: string,
		id: string,
		position: GraphPoint,
		data: unknown,
		capabilities: unknown,
		context: string
	): GraphNode {
		const definition = this.definitions.get(type)
		if (!definition) throw new Error(`Unknown node type "${type}"`)
		const node = definition.deserialize(id, position, data)
		if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
			throw new Error(`${context}.capabilities: expected an object`)
		}
		const serialized = capabilities as Record<string, unknown>
		const capabilityDefinitions = definition.capabilities ?? []
		const expectedIds = new Set(capabilityDefinitions.map((capability) => capability.id))
		for (const capabilityId of Object.keys(serialized)) {
			if (!expectedIds.has(capabilityId)) {
				throw new Error(`${context}.capabilities: node type "${type}" does not support "${capabilityId}"`)
			}
		}
		for (const capability of capabilityDefinitions) {
			if (!(capability.id in serialized)) {
				throw new Error(`${context}.capabilities: required capability "${capability.id}" is missing`)
			}
			capability.deserialize(node, serialized[capability.id], `${context}.capabilities.${capability.id}`)
		}
		return node
	}

	public evaluate(node: GraphNode, context: NodeEvaluationContext): EvaluatedNodeOutputs {
		return this.requireDefinition(node.type).evaluate?.(node, context) ?? new Map()
	}

	public canConnect(sourceType: GraphValueType, targetType: GraphValueType): boolean {
		return sourceType === targetType
	}

	public getCapabilityState<TState>(node: GraphNode, capabilityId: string): TState | undefined {
		const capability = this.getCapabilities(node).find((candidate) => candidate.id === capabilityId)
		return capability?.getState(node) as TState | undefined
	}

	public applyCapabilities(node: GraphNode, outputs: EvaluatedNodeOutputs): EvaluatedNodeOutputs {
		return this.getCapabilities(node).reduce(
			(current, capability) => capability.applyOutputs?.(node, current) ?? current,
			outputs
		)
	}

	public isAggregateInput(valueType: GraphValueType): boolean {
		return this.requireValueType(valueType).connectionMode === 'aggregate'
	}

	public aggregateInputs(valueType: GraphValueType, values: readonly GraphValue[], context: string): GraphValue {
		const definition = this.requireValueType(valueType)
		if (definition.connectionMode !== 'aggregate' || !definition.aggregate) {
			throw new Error(`${context}: value type "${valueType}" does not define aggregate input behavior`)
		}
		for (const [index, value] of values.entries()) {
			if (value.valueType !== valueType) {
				throw new Error(
					`${context}: aggregate value ${index + 1} has type "${value.valueType}"; expected "${valueType}"`
				)
			}
			if (valueType === 'geometry' && !Array.isArray(value.value)) {
				throw new Error(`${context}: aggregate geometry value ${index + 1} is not an instance array`)
			}
		}
		return definition.aggregate(values)
	}

	private requireDefinition(type: string): NodeDefinition {
		const definition = this.definitions.get(type)
		if (!definition) throw new Error(`Unknown node type "${type}"`)
		return definition
	}

	private requireValueType(valueType: GraphValueType): GraphValueTypeDefinition {
		const definition = this.valueTypes.get(valueType)
		if (!definition) throw new Error(`Unknown graph value type "${valueType}"`)
		return definition
	}

	private getCapabilities(node: GraphNode): readonly NodeCapabilityDefinition[] {
		return this.requireDefinition(node.type).capabilities ?? []
	}
}
