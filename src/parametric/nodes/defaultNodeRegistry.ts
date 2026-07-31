import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type {
	GeometryValue,
	NumberValue,
	EnumValue,
	ColorValue,
} from '@/parametric/evaluation/EvaluationTypes'
import {
	isSceneMetadata,
	type Matrix4Snapshot,
	type SceneAssetInstanceMetadata,
} from '@/parametric/evaluation/SceneMetadata'
import {
	NodeRegistry,
	type NumericFieldDefinition,
} from '@/parametric/model/NodeDefinition'
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
	type TransformOrigin,
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

interface TransformData {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
	origin: TransformOrigin
	copy?: boolean
	uniformScale?: boolean
}

interface MaterialData {
	color: string
}

interface ArrayData {
	count: number
	axis: Axis
	offset: number
}

interface GroupData {
	inputPorts: string[]
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

function geometry(assetInstances: SceneAssetInstanceMetadata[]): GeometryValue {
	return { valueType: 'geometry', value: { assetInstances } }
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

function matrixSnapshot(matrix: Matrix4): Matrix4Snapshot {
	return matrix.elements.slice() as unknown as Matrix4Snapshot
}

function createTransformMatrix(
	node: TransformGraphNode,
	size: Vector3Snapshot
): Matrix4Snapshot {
	const rotation = node.getRotation().toSnapshot()
	const translation = node.getTranslation().toSnapshot()
	const scale = node.getScale().toSnapshot()
	const origin = node.getOrigin()
	const pivot = new Vector3(
		getOriginOffset(origin.x, size.x),
		getOriginOffset(origin.y, size.y),
		getOriginOffset(origin.z, size.z)
	)
	const transform = new Matrix4().compose(
		new Vector3(),
		new Quaternion().setFromEuler(new Euler(
			(rotation.x * Math.PI) / 180,
			(rotation.y * Math.PI) / 180,
			(rotation.z * Math.PI) / 180,
			'XYZ'
		)),
		new Vector3(scale.x, scale.y, scale.z)
	)

	return matrixSnapshot(new Matrix4()
		.makeTranslation(translation.x, translation.y, translation.z)
		.multiply(new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
		.multiply(transform)
		.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z)))
}

function getOriginOffset(origin: 'min' | 'middle' | 'max', size: number): number {
	if (origin === 'min') return -size / 2
	if (origin === 'max') return size / 2
	return 0
}

export function createDefaultNodeRegistry(): NodeRegistry {
	const registry = new NodeRegistry()

	registry.register<PrimitiveGraphNode>({
		type: 'primitive',
		label: 'Primitive',
		creatable: true,
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
		evaluate: (node, context) => new Map([
			['geometry', geometry([{
				instanceId: node.id,
				assetId: `primitive:${node.getPrimitive()}`,
				assetKind: 'primitive',
				size: node.getSize().toSnapshot(),
				transform: matrixSnapshot(new Matrix4()),
				originNode: context.getNodeInstanceReference(node.id),
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
					assetId: meshId,
					assetKind: 'catalog',
					size,
					transform: matrixSnapshot(new Matrix4()),
					originNode: context.getNodeInstanceReference(node.id),
				}])],
			])
		},
	})

	registry.register<MeshAssetGraphNode>({
		type: 'meshAsset',
		label: 'Mesh Asset',
		creatable: true,
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
					assetId: meshId,
					assetKind: 'catalog',
					size,
					transform: matrixSnapshot(new Matrix4()),
					originNode: context.getNodeInstanceReference(node.id),
				}])],
			])
		},
	})

	registry.register<TransformGraphNode>({
		type: 'transform',
		label: 'Transform',
		creatable: true,
		create: (id, position) => new TransformGraphNode(
			id,
			position,
			new Vector3Value(0, 0, 0),
			new Vector3Value(0, 0, 0),
			new Vector3Value(1, 1, 1),
			{ x: 'middle', y: 'middle', z: 'middle' },
			false,
			true
		),
		ports: { inputs: geometryInput, outputs: geometryOutput },
		numericFields: {
			...vectorNumericFields(
				'translation',
				(node) => node.getTranslation(),
				(node, value) => node.setTranslation(value)
			),
			...vectorNumericFields(
				'rotation',
				(node) => node.getRotation(),
				(node, value) => node.setRotation(value)
			),
			...vectorNumericFields(
				'scale',
				(node) => node.getScale(),
				(node, value) => node.setScale(value)
			),
		},
		serialize: (node) => ({
			translation: node.getTranslation().toSnapshot(),
			rotation: node.getRotation().toSnapshot(),
			scale: node.getScale().toSnapshot(),
			origin: node.getOrigin(),
			copy: node.getCopy(),
			uniformScale: node.getUniformScale(),
		}),
		deserialize: (id, position, data) => {
			const value = data as TransformData
			return new TransformGraphNode(
				id,
				position,
				Vector3Value.from(value.translation),
				Vector3Value.from(value.rotation),
				Vector3Value.from(value.scale),
				value.origin,
				value.copy ?? false,
				value.uniformScale ?? (
					value.scale.x === value.scale.y && value.scale.y === value.scale.z
				)
			)
		},
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) return new Map()
			const instances = input.value.assetInstances
			const transformed = instances.map((instance) => ({
				...instance,
				instanceId: `${node.id}/transformed/${instance.instanceId}`,
				transform: matrixSnapshot(
					new Matrix4()
						.fromArray(createTransformMatrix(node, instance.size))
						.multiply(new Matrix4().fromArray(instance.transform))
				),
			}))
			const output = node.getCopy()
				? [
					...instances.map((instance) => ({
						...instance,
						instanceId: `${node.id}/original/${instance.instanceId}`,
					})),
					...transformed,
				]
				: transformed
			return new Map([
				['geometry', geometry(output)],
			])
		},
	})

	registry.register<MaterialGraphNode>({
		type: 'material',
		label: 'Material',
		creatable: true,
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
				|| !isSceneMetadata(input.value)
				|| color?.valueType !== 'color'
				|| typeof color.value !== 'string'
			) return new Map()

			return new Map([
				['geometry', geometry(input.value.assetInstances.map((instance) => ({
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
				|| !isSceneMetadata(input.value)
				|| count?.valueType !== 'number'
				|| typeof count.value !== 'number'
			) return new Map()

			const translation = node.getAxis() === 'x'
				? new Vector3(node.getOffset(), 0, 0)
				: node.getAxis() === 'y'
					? new Vector3(0, node.getOffset(), 0)
					: new Vector3(0, 0, node.getOffset())
			const instances = input.value.assetInstances
			return new Map([
				['geometry', geometry(instances.flatMap((instance) =>
					Array.from({ length: Math.max(1, Math.floor(count.value as number)) }, (_, index) => ({
						...instance,
						instanceId: `${node.id}/${index}/${instance.instanceId}`,
						transform: matrixSnapshot(new Matrix4()
							.makeTranslation(translation.x * index, translation.y * index, translation.z * index)
							.multiply(new Matrix4().fromArray(instance.transform))),
					}))
				))],
			])
		},
	})

	registry.register<GroupGraphNode>({
		type: 'group',
		label: 'Group',
		creatable: true,
		create: (id, position) => new GroupGraphNode(id, position),
		ports: {
			inputs: (node) => node.getInputPortIds().map((id) => ({ id, valueType: 'geometry' })),
			outputs: geometryOutput,
		},
		syncInputPorts: (node, connectedPortIds) => node.syncInputPorts(connectedPortIds),
		serialize: (node) => ({ inputPorts: node.getInputPortIds() }),
		deserialize: (id, position, data) =>
			new GroupGraphNode(id, position, (data as GroupData).inputPorts),
		evaluate: (node, context) => {
			const instances = node.getInputPortIds().flatMap((portId) => {
				const input = context.resolveInput(node, portId)
				if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) return []
				return input.value.assetInstances.map((instance) => ({
					...instance,
					instanceId: `${node.id}/${portId}/${instance.instanceId}`,
				}))
			})
			return new Map([['geometry', geometry(instances)]])
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
