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

export interface NodeDefinition<TNode extends GraphNode = GraphNode> {
	type: string
	label: string
	creatable: boolean
	create?: (id: string, position: GraphPoint, context: NodeCreationContext) => TNode
	ports: NodePortDefinition<TNode>
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

export class NodeRegistry {
	private readonly definitions = new Map<string, NodeDefinition>()

	public register<TNode extends GraphNode>(definition: NodeDefinition<TNode>): this {
		if (this.definitions.has(definition.type)) {
			throw new Error(`Node type "${definition.type}" is already registered`)
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
		return this.requireDefinition(node.type).numericFields?.[field]?.get(node)
	}

	public setNumericValue(node: GraphNode, field: string, value: number): boolean {
		const numericField = this.requireDefinition(node.type).numericFields?.[field]
		if (!numericField) return false
		numericField.set(node, Number.isFinite(value) ? value : 0)
		return true
	}

	public serialize(node: GraphNode): unknown {
		return this.requireDefinition(node.type).serialize(node)
	}

	public deserialize(type: string, id: string, position: GraphPoint, data: unknown): GraphNode {
		const definition = this.definitions.get(type)
		if (!definition) throw new Error(`Unknown node type "${type}"`)
		return definition.deserialize(id, position, data)
	}

	public evaluate(node: GraphNode, context: NodeEvaluationContext): EvaluatedNodeOutputs {
		return this.requireDefinition(node.type).evaluate?.(node, context) ?? new Map()
	}

	public canConnect(sourceType: GraphValueType, targetType: GraphValueType): boolean {
		return sourceType === targetType
	}

	private requireDefinition(type: string): NodeDefinition {
		const definition = this.definitions.get(type)
		if (!definition) throw new Error(`Unknown node type "${type}"`)
		return definition
	}
}
