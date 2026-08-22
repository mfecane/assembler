import type {
	GraphInputDefault,
	GraphInputPort,
	GraphNode,
	GraphOutputPort,
	GraphPoint,
	GraphValueType,
} from '@/parametric/model/GraphNode'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type { MaterialCatalog } from '@/parametric/model/MaterialCatalog'
import type {
	EvaluatedNodeOutputs,
	NodeEvaluationContext,
} from '@/parametric/evaluation/EvaluationTypes'
import type { GraphInterface } from '@/parametric/model/GraphDocumentModel'

export interface NodeCreationContext {
	meshCatalog: MeshCatalog
	materialCatalog: MaterialCatalog
}

export interface NodePortContext {
	containingGraphId: string
	getGraphInterface(graphId: string): GraphInterface | undefined
	getEnumOptions(enumId: string): readonly string[]
	getStretchableAxes?(meshId: string): readonly ('x' | 'y' | 'z')[]
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

export type FieldKind = 'number' | 'boolean' | 'enum' | 'text'

export interface FieldDefinition<TNode extends GraphNode> {
	kind: FieldKind
	get(node: TNode): unknown
	set(node: TNode, value: unknown): void
	options?: (node: TNode) => readonly string[]
}

export interface NodeDefinition<TNode extends GraphNode = GraphNode> {
	type: string
	label: string
	aliases?: readonly string[]
	creatable: boolean
	create?: (id: string, position: GraphPoint, context: NodeCreationContext) => TNode
	ports: NodePortDefinition<TNode>
	isOutput?: boolean
	fields?: Record<string, FieldDefinition<TNode>>
	bypass?: { enabledField?: string; enabledInput?: string; input: string; output: string }
	defaultData?: Record<string, unknown>
	serialize(node: TNode): unknown
	deserialize(id: string, position: GraphPoint, data: unknown): TNode
	evaluate?: (node: TNode, context: NodeEvaluationContext) => EvaluatedNodeOutputs
}

export interface CreatableNodeDefinition {
	type: string
	label: string
	aliases?: readonly string[]
}

export class NodeRegistry {
	private readonly definitions = new Map<string, NodeDefinition<any>>()

	public register<TNode extends GraphNode>(definition: NodeDefinition<TNode>): this {
		if (this.definitions.has(definition.type)) {
			throw new Error(`Node type "${definition.type}" is already registered`)
		}
		this.definitions.set(definition.type, definition)
		return this
	}

	public getDefinition(type: string): NodeDefinition | undefined {
		return this.definitions.get(type)
	}

	public getLabel(type: string): string {
		return this.requireDefinition(type).label
	}

	public getCreatableDefinitions(): CreatableNodeDefinition[] {
		return [...this.definitions.values()]
			.filter((definition) => definition.creatable && definition.create)
			.map(({ type, label, aliases }) => ({ type, label, aliases }))
	}

	public create(type: string, id: string, position: GraphPoint, context: NodeCreationContext): GraphNode | undefined {
		const definition = this.definitions.get(type)
		const node = definition?.create?.(id, position, context)
		if (node && definition) node.setName(definition.label)
		return node
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

	public isMultiInput(node: GraphNode, portId: string, context?: NodePortContext): boolean {
		const port = this.getInputPorts(node, context).find((candidate) => candidate.id === portId)
		return Boolean(port && (port.multiple ?? port.valueType === 'geometry'))
	}

	public getFieldValue(node: GraphNode, field: string): unknown {
		return this.requireDefinition(node.type).fields?.[field]?.get(node)
	}

	public setFieldValue(node: GraphNode, field: string, value: unknown): boolean {
		const definition = this.requireDefinition(node.type).fields?.[field]
		if (!definition) return false
		let normalized: unknown
		if (definition.kind === 'number') {
			normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0
		} else if (definition.kind === 'boolean') {
			normalized = typeof value === 'boolean' ? value : false
		} else if (definition.kind === 'enum') {
			if (typeof value !== 'string') return false
			const options = definition.options?.(node)
			if (options && !options.includes(value)) return false
			normalized = value
		} else {
			if (typeof value !== 'string') return false
			normalized = value
		}
		definition.set(node, normalized)
		return true
	}

	public serialize(node: GraphNode): unknown {
		const definition = this.requireDefinition(node.type)
		return omitDefaultData(definition.serialize(node), definition.defaultData)
	}

	public deserialize(type: string, id: string, position: GraphPoint, data: unknown): GraphNode {
		const definition = this.definitions.get(type)
		if (!definition) throw new Error(`Unknown node type "${type}"`)
		return definition.deserialize(id, position, mergeDefaultData(definition.defaultData, data))
	}

	public evaluate(node: GraphNode, context: NodeEvaluationContext): EvaluatedNodeOutputs {
		const definition = this.requireDefinition(node.type)
		if (definition.bypass) {
			const enabledInput = definition.bypass.enabledInput
			const inputValue = enabledInput ? context.resolveInput(node, enabledInput) : undefined
			const storedEnabled = this.getFieldValue(node, definition.bypass.enabledField ?? 'enabled')
			const enabled = inputValue?.valueType === 'boolean'
				? inputValue.value
				: storedEnabled
			if (enabled === false) {
				const input = context.resolveInput(node, definition.bypass.input)
				return input ? new Map([[definition.bypass.output, input]]) : new Map()
			}
		}
		return definition.evaluate?.(node, context) ?? new Map()
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

function omitDefaultData(data: unknown, defaultData: Record<string, unknown> | undefined): unknown {
	if (!defaultData || !isDataObject(data)) return data
	return Object.fromEntries(Object.entries(data).flatMap(([key, value]) => {
		if (JSON.stringify(value) === JSON.stringify(defaultData[key])) return []
		const compactValue = omitDefaultData(value, isDataObject(defaultData[key]) ? defaultData[key] : undefined)
		return [[key, compactValue]]
	}))
}

function mergeDefaultData(defaultData: Record<string, unknown> | undefined, data: unknown): unknown {
	if (!defaultData || !isDataObject(data)) return data
	return Object.fromEntries([...new Set([...Object.keys(defaultData), ...Object.keys(data)])].map((key) => [
		key,
		key in data
			? mergeDefaultData(isDataObject(defaultData[key]) ? defaultData[key] : undefined, data[key])
			: defaultData[key],
	]))
}

function isDataObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
