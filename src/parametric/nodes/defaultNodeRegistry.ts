import { Matrix4, Vector3 } from 'three'
import type {
	EvaluatedInstance,
	GeometryValue,
	NumberValue,
	EnumValue,
	ColorValue,
} from '@/parametric/evaluation/EvaluationTypes'
import {
	NodeRegistry,
	type NumericFieldDefinition,
} from '@/parametric/model/NodeDefinition'
import { transformCapability } from '@/parametric/model/TransformCapability'
import {
	ArrayGraphNode,
	type Axis,
	ColorGraphNode,
	GraphInputGraphNode,
	GraphInstanceGraphNode,
	type GraphNode,
	GroupGraphNode,
	MaterialGraphNode,
	MeshAssetGraphNode,
	type MeshSelection,
	MeshSelectorGraphNode,
	NumberInputGraphNode,
	OutputGraphNode,
	PrimitiveGraphNode,
	type PrimitiveKind,
	SelectorGraphNode,
	SumGraphNode,
	TransformGraphNode,
} from '@/parametric/model/GraphNode'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'

interface PrimitiveData {
	primitive: PrimitiveKind
	size: Vector3Snapshot
}

interface NumberInputData {
	label: string
	value: number
}

interface SelectorData {
	label: string
	options: string[]
	value: string
}

interface ColorData {
	label?: string
	color: string
}

interface MeshSelectorData {
	selections: MeshSelection[]
}

interface MeshAssetData {
	meshId: string
}

interface MaterialData {
	color: string
}

interface ArrayData {
	count: number
	axis: Axis
	offset: number
}

interface SumData {
	constant: number
	inputPorts: string[]
}

const geometryInput = [{ id: 'geometry', valueType: 'geometry' }] as const
const geometryOutput = [{ id: 'geometry', valueType: 'geometry' }] as const

function vectorNumericFields<TNode extends GraphNode>(
	prefix: string,
	getValue: (node: TNode) => Vector3Value,
	setValue: (node: TNode, value: Vector3Value) => void
): Record<string, NumericFieldDefinition<TNode>> {
	return Object.fromEntries((['x', 'y', 'z'] as const).map((axis) => [
		`${prefix}.${axis}`,
		{
			get: (node: TNode) => getValue(node)[axis],
			set: (node: TNode, value: number) => {
				const current = getValue(node)
				setValue(node, new Vector3Value(
					axis === 'x' ? value : current.x,
					axis === 'y' ? value : current.y,
					axis === 'z' ? value : current.z
				))
			},
		},
	]))
}

function geometry(value: EvaluatedInstance[]): GeometryValue {
	return { valueType: 'geometry', value }
}

function number(value: number): NumberValue {
	return { valueType: 'number', value }
}

function enumValue(value: string): EnumValue {
	return { valueType: 'enum', value }
}

function colorValue(value: string): ColorValue {
	return { valueType: 'color', value }
}

export function createDefaultNodeRegistry(): NodeRegistry {
	const registry = new NodeRegistry()

	registry.register<PrimitiveGraphNode>({
		type: 'primitive',
		label: 'Primitive',
		creatable: true,
		capabilities: [transformCapability<PrimitiveGraphNode>()],
		create: (id, position) =>
			new PrimitiveGraphNode(id, position, 'box', new Vector3Value(1, 1, 1)),
		ports: { outputs: geometryOutput },
		numericFields: vectorNumericFields(
			'size',
			(node) => node.getSize(),
			(node, value) => node.setSize(value)
		),
		serialize: (node) => ({
			primitive: node.getPrimitive(),
			size: node.getSize().toSnapshot(),
		}),
		deserialize: (id, position, data) => {
			const value = data as PrimitiveData
			return new PrimitiveGraphNode(id, position, value.primitive, Vector3Value.from(value.size))
		},
		evaluate: (node) => new Map([
			['geometry', geometry([{
				instanceId: node.id,
				meshId: `primitive:${node.getPrimitive()}`,
				size: node.getSize().toSnapshot(),
				matrix: new Matrix4(),
			}])],
		]),
	})

	registry.register<NumberInputGraphNode>({
		type: 'numberInput',
		label: 'Number',
		creatable: true,
		create: (id, position) => new NumberInputGraphNode(id, position, 'Number', 1),
		ports: { outputs: [{ id: 'number', valueType: 'number' }] },
		numericFields: {
			value: {
				get: (node) => node.getValue(),
				set: (node, value) => node.setValue(value),
			},
		},
		serialize: (node) => ({ label: node.getLabel(), value: node.getValue() }),
		deserialize: (id, position, data) => {
			const value = data as NumberInputData
			return new NumberInputGraphNode(id, position, value.label, value.value)
		},
		evaluate: (node) => new Map([['number', number(node.getValue())]]),
	})

	registry.register<SelectorGraphNode>({
		type: 'selector',
		label: 'Enum',
		creatable: true,
		create: (id, position) =>
			new SelectorGraphNode(id, position, 'Style', ['Cube', 'Cone', 'Ring'], 'Cube'),
		ports: {
			outputs: [{ id: 'enum', valueType: 'enum' }],
			getOutputOptions: (node, portId) => portId === 'enum' ? node.getOptions() : undefined,
		},
		serialize: (node) => ({
			label: node.getLabel(),
			options: node.getOptions(),
			value: node.getValue(),
		}),
		deserialize: (id, position, data) => {
			const value = data as SelectorData
			return new SelectorGraphNode(id, position, value.label, value.options, value.value)
		},
		evaluate: (node) => new Map([['enum', enumValue(node.getValue())]]),
	})

	registry.register<ColorGraphNode>({
		type: 'color',
		label: 'Color',
		creatable: true,
		create: (id, position) => new ColorGraphNode(id, position, 'Color', defaultMaterialColor),
		ports: { outputs: [{ id: 'color', valueType: 'color' }] },
		serialize: (node) => ({ label: node.getLabel(), color: node.getColor() }),
		deserialize: (id, position, data) => {
			const value = data as ColorData
			return new ColorGraphNode(id, position, value.label ?? 'Color', value.color)
		},
		evaluate: (node) => new Map([['color', colorValue(node.getColor())]]),
	})

	registry.register<MeshSelectorGraphNode>({
		type: 'meshSelector',
		label: 'Mesh Selector',
		creatable: true,
		capabilities: [transformCapability<MeshSelectorGraphNode>()],
		create: (id, position, { meshCatalog }) => {
			const meshes = meshCatalog.getMeshes().filter((mesh) => mesh.selectable)
			return new MeshSelectorGraphNode(
				id,
				position,
				meshes.map((mesh) => ({ enumValue: mesh.label, meshId: mesh.id }))
			)
		},
		ports: {
			inputs: [{ id: 'enum', valueType: 'enum' }],
			outputs: geometryOutput,
		},
		serialize: (node) => ({ selections: node.getSelections() }),
		deserialize: (id, position, data) =>
			new MeshSelectorGraphNode(id, position, (data as MeshSelectorData).selections),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'enum')
			if (input?.valueType !== 'enum' || typeof input.value !== 'string') return new Map()
			const meshId = node.getMeshId(input.value)
			const size = meshId ? context.getMeshBounds(meshId) : undefined
			if (!meshId || !size) return new Map()
			return new Map([
				['geometry', geometry([{
					instanceId: node.id,
					meshId,
					size,
					matrix: new Matrix4(),
					assetSource: { graphId: context.graphId, nodeId: node.id },
				}])],
			])
		},
	})

	registry.register<MeshAssetGraphNode>({
		type: 'meshAsset',
		label: 'Mesh Asset',
		creatable: true,
		capabilities: [transformCapability<MeshAssetGraphNode>()],
		create: (id, position, { meshCatalog }) => {
			const meshId = meshCatalog.getMeshes().find((mesh) => mesh.selectable)?.id ?? ''
			return new MeshAssetGraphNode(id, position, meshId)
		},
		ports: { outputs: geometryOutput },
		serialize: (node) => ({ meshId: node.getMeshId() }),
		deserialize: (id, position, data) =>
			new MeshAssetGraphNode(id, position, (data as MeshAssetData).meshId),
		evaluate: (node, context) => {
			const meshId = node.getMeshId()
			const size = context.getMeshBounds(meshId)
			if (!meshId || !size) return new Map()
			return new Map([
				['geometry', geometry([{
					instanceId: node.id,
					meshId,
					size,
					matrix: new Matrix4(),
					assetSource: { graphId: context.graphId, nodeId: node.id },
				}])],
			])
		},
	})

	registry.register<TransformGraphNode>({
		type: 'transform',
		label: 'Transform',
		creatable: true,
		capabilities: [transformCapability<TransformGraphNode>()],
		create: (id, position) => new TransformGraphNode(id, position),
		ports: { inputs: geometryInput, outputs: geometryOutput },
		serialize: () => ({}),
		deserialize: (id, position) => new TransformGraphNode(id, position),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			if (input?.valueType !== 'geometry' || !Array.isArray(input.value)) return new Map()
			return new Map([['geometry', input as GeometryValue]])
		},
	})

	registry.register<MaterialGraphNode>({
		type: 'material',
		label: 'Material',
		creatable: true,
		capabilities: [transformCapability<MaterialGraphNode>()],
		create: (id, position) => new MaterialGraphNode(id, position, defaultMaterialColor),
		ports: {
			inputs: [
				{ id: 'geometry', valueType: 'geometry' },
				{ id: 'color', valueType: 'color' },
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) =>
				portId === 'color' ? { valueType: 'color', value: node.getColor() } : undefined,
		},
		serialize: (node) => ({ color: node.getColor() }),
		deserialize: (id, position, data) =>
			new MaterialGraphNode(id, position, (data as MaterialData).color),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			const color = context.resolveInput(node, 'color')
			if (
				input?.valueType !== 'geometry'
				|| !Array.isArray(input.value)
				|| color?.valueType !== 'color'
				|| typeof color.value !== 'string'
			) return new Map()

			return new Map([
				['geometry', geometry((input.value as EvaluatedInstance[]).map((instance) => ({
					...instance,
					instanceId: `${node.id}/${instance.instanceId}`,
					material: { type: 'standard', color: color.value as string },
				})))],
			])
		},
	})

	registry.register<ArrayGraphNode>({
		type: 'array',
		label: 'Array',
		creatable: true,
		capabilities: [transformCapability<ArrayGraphNode>()],
		create: (id, position) => new ArrayGraphNode(id, position, 2, 'x', 1),
		ports: {
			inputs: [
				{ id: 'geometry', valueType: 'geometry' },
				{ id: 'count', valueType: 'number' },
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) =>
				portId === 'count' ? { valueType: 'number', value: node.getCount() } : undefined,
		},
		numericFields: {
			count: {
				get: (node) => node.getCount(),
				set: (node, value) => node.setCount(value),
			},
			offset: {
				get: (node) => node.getOffset(),
				set: (node, value) => node.setOffset(value),
			},
		},
		serialize: (node) => ({
			count: node.getCount(),
			axis: node.getAxis(),
			offset: node.getOffset(),
		}),
		deserialize: (id, position, data) => {
			const value = data as ArrayData
			return new ArrayGraphNode(id, position, value.count, value.axis, value.offset)
		},
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			const count = context.resolveInput(node, 'count')
			if (
				input?.valueType !== 'geometry'
				|| !Array.isArray(input.value)
				|| count?.valueType !== 'number'
				|| typeof count.value !== 'number'
			) return new Map()

			const translation = node.getAxis() === 'x'
				? new Vector3(node.getOffset(), 0, 0)
				: node.getAxis() === 'y'
					? new Vector3(0, node.getOffset(), 0)
					: new Vector3(0, 0, node.getOffset())
			const instances = input.value as EvaluatedInstance[]
			return new Map([
				['geometry', geometry(instances.flatMap((instance) =>
					Array.from({ length: Math.max(1, Math.floor(count.value as number)) }, (_, index) => ({
						...instance,
						instanceId: `${node.id}/${index}/${instance.instanceId}`,
						matrix: new Matrix4()
							.makeTranslation(translation.x * index, translation.y * index, translation.z * index)
							.multiply(instance.matrix),
					}))
				))],
			])
		},
	})

	registry.register<GroupGraphNode>({
		type: 'group',
		label: 'Group',
		creatable: true,
		capabilities: [transformCapability<GroupGraphNode>()],
		create: (id, position) => new GroupGraphNode(id, position),
		ports: { inputs: geometryInput, outputs: geometryOutput },
		serialize: () => ({}),
		deserialize: (id, position) => new GroupGraphNode(id, position),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			return input?.valueType === 'geometry' && Array.isArray(input.value)
				? new Map([['geometry', input as GeometryValue]])
				: new Map()
		},
	})

	registry.register<SumGraphNode>({
		type: 'sum',
		label: 'Sum',
		creatable: true,
		create: (id, position) => new SumGraphNode(id, position, 0),
		ports: {
			inputs: (node) => node.getInputPortIds().map((id) => ({ id, valueType: 'number' })),
			outputs: [{ id: 'number', valueType: 'number' }],
		},
		syncInputPorts: (node, connectedPortIds) => node.syncInputPorts(connectedPortIds),
		numericFields: {
			constant: {
				get: (node) => node.getConstant(),
				set: (node, value) => node.setConstant(value),
			},
		},
		serialize: (node) => ({
			constant: node.getConstant(),
			inputPorts: node.getInputPortIds(),
		}),
		deserialize: (id, position, data) => {
			const value = data as SumData
			return new SumGraphNode(id, position, value.constant, value.inputPorts)
		},
		evaluate: (node, context) => {
			const total = node.getInputPortIds().reduce((sum, portId) => {
				const input = context.resolveInput(node, portId)
				return input?.valueType === 'number' && typeof input.value === 'number'
					? sum + input.value
					: sum
			}, node.getConstant())
			return new Map([['number', number(total)]])
		},
	})

	registry.register<OutputGraphNode>({
		type: 'graphOutput',
		label: 'Assembly Output',
		creatable: false,
		isOutput: true,
		ports: {
			inputs: (_node, context) => {
				const graph = context?.getGraphInterface(context.containingGraphId)
				return graph ? [{ id: graph.output.id, valueType: graph.output.valueType }] : []
			},
		},
		serialize: () => ({}),
		deserialize: (id, position) => new OutputGraphNode(id, position),
	})

	registry.register<GraphInputGraphNode>({
		type: 'graphInput',
		label: 'Assembly Input',
		creatable: false,
		ports: {
			outputs: (node, context) => {
				const graph = context?.getGraphInterface(context.containingGraphId)
				const input = graph?.inputs.find((candidate) => candidate.id === node.getInputId())
				return input ? [{ id: input.id, valueType: input.valueType }] : []
			},
			getOutputOptions: (node, portId, context) => {
				const graph = context?.getGraphInterface(context.containingGraphId)
				const input = graph?.inputs.find((candidate) => candidate.id === node.getInputId())
				return input?.id === portId && input.valueType === 'enum' ? input.options : undefined
			},
		},
		serialize: (node) => ({ inputId: node.getInputId() }),
		deserialize: (id, position, data) =>
			new GraphInputGraphNode(id, position, (data as { inputId: string }).inputId),
	})

	registry.register<GraphInstanceGraphNode>({
		type: 'graphInstance',
		label: 'Assembly Instance',
		creatable: false,
		capabilities: [transformCapability<GraphInstanceGraphNode>()],
		ports: {
			inputs: (node, context) =>
				context?.getGraphInterface(node.getGraphId())?.inputs.map((input) => ({
					id: input.id,
					valueType: input.valueType,
				})) ?? [],
			outputs: (node, context) => {
				const output = context?.getGraphInterface(node.getGraphId())?.output
				return output ? [{ id: output.id, valueType: output.valueType }] : []
			},
		},
		serialize: (node) => ({ graphId: node.getGraphId() }),
		deserialize: (id, position, data) =>
			new GraphInstanceGraphNode(id, position, (data as { graphId: string }).graphId),
	})

	return registry
}

export const defaultNodeRegistry = createDefaultNodeRegistry()
