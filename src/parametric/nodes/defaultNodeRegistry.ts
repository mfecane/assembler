import { Matrix4, Vector3 } from 'three'
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
	type FieldDefinition,
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
import { applyTransform } from '@/parametric/evaluation/applyTransform'
import { TransformField, type TransformFieldSnapshot } from '@/parametric/model/fields/TransformField'

interface PrimitiveData {
	primitive: PrimitiveKind
	size: Vector3Snapshot
}

interface NumberInputData {
	value: number
}

interface SelectorData {
	options: string[]
	value: string
}

interface ColorData {
	color: string
}

interface MeshSelectorData {
	selections: MeshSelection[]
	transform?: TransformFieldSnapshot
}

interface MeshAssetData {
	meshId: string
	transform?: TransformFieldSnapshot
}

interface TransformData {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
	origin: TransformOrigin
	copy?: boolean
	uniformScale?: boolean
	enabled?: boolean
}

interface MaterialData {
	color: string
}

interface ArrayData {
	count: number
	axis: Axis
	offset: number
}

interface GraphInstanceData {
	graphId: string
	transform: TransformFieldSnapshot
}

interface SumData {
	constant: number
	enabled: boolean
}

const geometryInput = [{ id: 'geometry', valueType: 'geometry' }] as const
const geometryOutput = [{ id: 'geometry', valueType: 'geometry' }] as const

function vectorNumericFields<TNode extends GraphNode>(
	prefix: string,
	getValue: (node: TNode) => Vector3Value,
	setValue: (node: TNode, value: Vector3Value) => void
): Record<string, FieldDefinition<TNode>> {
	return Object.fromEntries((['x', 'y', 'z'] as const).map((axis) => [
		`${prefix}.${axis}`,
		{
			kind: 'number' as const,
			get: (node: TNode) => getValue(node)[axis],
			set: (node: TNode, value: unknown) => {
				const current = getValue(node)
				setValue(node, new Vector3Value(
					axis === 'x' ? value as number : current.x,
					axis === 'y' ? value as number : current.y,
					axis === 'z' ? value as number : current.z
				))
			},
		},
	]))
}

const numberField = <TNode extends GraphNode>(
	get: (node: TNode) => number,
	set: (node: TNode, value: number) => void
): FieldDefinition<TNode> => ({ kind: 'number', get, set: (node, value) => set(node, value as number) })

const booleanField = <TNode extends GraphNode>(
	get: (node: TNode) => boolean,
	set: (node: TNode, value: boolean) => void
): FieldDefinition<TNode> => ({ kind: 'boolean', get, set: (node, value) => set(node, value as boolean) })

const enumField = <TNode extends GraphNode, TValue extends string>(
	get: (node: TNode) => TValue,
	set: (node: TNode, value: TValue) => void,
	options?: (node: TNode) => readonly string[]
): FieldDefinition<TNode> => ({ kind: 'enum', get, set: (node, value) => set(node, value as TValue), options })

const colorField = <TNode extends GraphNode>(
	get: (node: TNode) => string,
	set: (node: TNode, value: string) => void
): FieldDefinition<TNode> => ({ kind: 'color', get, set: (node, value) => set(node, value as string) })

function transformFields<TNode extends GraphNode>(
	prefix: string,
	getTransform: (node: TNode) => TransformField
): Record<string, FieldDefinition<TNode>> {
	const name = (field: string) => prefix ? `${prefix}.${field}` : field
	const originOptions = () => ['min', 'middle', 'max']
	return {
		...vectorNumericFields(name('translation'), (node) => getTransform(node).getTranslation(),
			(node, value) => getTransform(node).setTranslation(value)),
		...vectorNumericFields(name('rotation'), (node) => getTransform(node).getRotation(),
			(node, value) => getTransform(node).setRotation(value)),
		...vectorNumericFields(name('scale'), (node) => getTransform(node).getScale(),
			(node, value) => getTransform(node).setScale(value)),
		...Object.fromEntries((['x', 'y', 'z'] as const).map((axis) => [
			name(`origin.${axis}`),
			enumField(
				(node: TNode) => getTransform(node).getOrigin()[axis],
				(node: TNode, value: TransformOrigin[typeof axis]) => getTransform(node).setOrigin({
					...getTransform(node).getOrigin(),
					[axis]: value,
				}),
				originOptions
			),
		])),
	}
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

export function createDefaultNodeRegistry(): NodeRegistry {
	const registry = new NodeRegistry()

	registry.register<PrimitiveGraphNode>({
		type: 'primitive',
		label: 'Primitive',
		creatable: true,
		create: (id, position) =>
			new PrimitiveGraphNode(id, position, 'box', new Vector3Value(1, 1, 1)),
		ports: { outputs: geometryOutput },
		fields: {
			primitive: enumField(
				(node) => node.getPrimitive(),
				(node, value) => node.setPrimitive(value),
				() => ['box', 'sphere', 'cylinder', 'cone']
			),
			...vectorNumericFields('size', (node) => node.getSize(),
				(node, value) => node.setSize(value)),
		},
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
		create: (id, position) => new NumberInputGraphNode(id, position, 1),
		ports: { outputs: [{ id: 'number', valueType: 'number' }] },
		fields: { value: numberField((node) => node.getValue(), (node, value) => node.setValue(value)) },
		serialize: (node) => ({ value: node.getValue() }),
		deserialize: (id, position, data) => {
			const value = data as NumberInputData
			return new NumberInputGraphNode(id, position, value.value)
		},
		evaluate: (node) => new Map([['number', number(node.getValue())]]),
	})

	registry.register<SelectorGraphNode>({
		type: 'selector',
		label: 'Enum',
		creatable: true,
		create: (id, position) =>
			new SelectorGraphNode(id, position, ['Cube', 'Cone', 'Ring'], 'Cube'),
		ports: {
			outputs: [{ id: 'enum', valueType: 'enum' }],
			getOutputOptions: (node, portId) => portId === 'enum' ? node.getOptions() : undefined,
		},
		fields: {
			value: enumField(
				(node) => node.getValue(),
				(node, value) => node.setValue(value),
				(node) => node.getOptions()
			),
		},
		serialize: (node) => ({
			options: node.getOptions(),
			value: node.getValue(),
		}),
		deserialize: (id, position, data) => {
			const value = data as SelectorData
			return new SelectorGraphNode(id, position, value.options, value.value)
		},
		evaluate: (node) => new Map([['enum', enumValue(node.getValue())]]),
	})

	registry.register<ColorGraphNode>({
		type: 'color',
		label: 'Color',
		creatable: true,
		create: (id, position) => new ColorGraphNode(id, position, defaultMaterialColor),
		ports: { outputs: [{ id: 'color', valueType: 'color' }] },
		fields: { color: colorField((node) => node.getColor(), (node, value) => node.setColor(value)) },
		serialize: (node) => ({ color: node.getColor() }),
		deserialize: (id, position, data) => {
			const value = data as ColorData
			return new ColorGraphNode(id, position, value.color)
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
		fields: transformFields('transform', (node) => node.getTransform()),
		serialize: (node) => ({
			selections: node.getSelections(),
			transform: node.getTransform().serialize(),
		}),
		deserialize: (id, position, data) =>
			new MeshSelectorGraphNode(
				id,
				position,
				(data as MeshSelectorData).selections,
				new TransformField((data as MeshSelectorData).transform)
			),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'enum')
			if (input?.valueType !== 'enum' || typeof input.value !== 'string') return new Map()
			const meshId = node.getMeshId(input.value)
			const size = meshId ? context.getMeshBounds(meshId) : undefined
			if (!meshId || !size) return new Map()
			const instances = [{
					instanceId: node.id,
					assetId: meshId,
					assetKind: 'catalog' as const,
					size,
					transform: matrixSnapshot(new Matrix4()),
					originNode: context.getNodeInstanceReference(node.id),
				}]
			return new Map([['geometry', geometry(applyTransform(
				node.getTransform(), instances, (instance) => instance.instanceId
			))]])
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
		fields: {
			meshId: enumField((node) => node.getMeshId(), (node, value) => node.setMeshId(value)),
			...transformFields('transform', (node) => node.getTransform()),
		},
		serialize: (node) => ({
			meshId: node.getMeshId(),
			transform: node.getTransform().serialize(),
		}),
		deserialize: (id, position, data) =>
			new MeshAssetGraphNode(
				id,
				position,
				(data as MeshAssetData).meshId,
				new TransformField((data as MeshAssetData).transform)
			),
		evaluate: (node, context) => {
			const meshId = node.getMeshId()
			const size = context.getMeshBounds(meshId)
			if (!meshId || !size) return new Map()
			const instances = [{
					instanceId: node.id,
					assetId: meshId,
					assetKind: 'catalog' as const,
					size,
					transform: matrixSnapshot(new Matrix4()),
					originNode: context.getNodeInstanceReference(node.id),
				}]
			return new Map([['geometry', geometry(applyTransform(
				node.getTransform(), instances, (instance) => instance.instanceId
			))]])
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
		fields: {
			...transformFields('', (node) => node.getTransform()),
			copy: booleanField((node) => node.getCopy(), (node, value) => node.setCopy(value)),
			enabled: booleanField((node) => node.getEnabled(), (node, value) => node.setEnabled(value)),
		},
		bypass: { input: 'geometry', output: 'geometry' },
		serialize: (node) => ({
			translation: node.getTranslation().toSnapshot(),
			rotation: node.getRotation().toSnapshot(),
			scale: node.getScale().toSnapshot(),
			origin: node.getOrigin(),
			copy: node.getCopy(),
			uniformScale: node.getUniformScale(),
			enabled: node.getEnabled(),
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
				),
				value.enabled ?? true
			)
		},
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) return new Map()
			const instances = input.value.assetInstances
			const transformed = applyTransform(
				node.getTransform(),
				instances,
				(instance) => `${node.id}/transformed/${instance.instanceId}`
			)
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
		fields: { color: colorField((node) => node.getColor(), (node, value) => node.setColor(value)) },
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
		fields: {
			count: numberField((node) => node.getCount(), (node, value) => node.setCount(value)),
			offset: numberField((node) => node.getOffset(), (node, value) => node.setOffset(value)),
			axis: enumField(
				(node) => node.getAxis(),
				(node, value) => node.setAxis(value),
				() => ['x', 'y', 'z']
			),
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
			const arrayInstances = instances.flatMap((instance) =>
					Array.from({ length: Math.max(1, Math.floor(count.value as number)) }, (_, index) => ({
						...instance,
						instanceId: `${node.id}/${index}/${instance.instanceId}`,
						transform: matrixSnapshot(new Matrix4()
							.makeTranslation(translation.x * index, translation.y * index, translation.z * index)
							.multiply(new Matrix4().fromArray(instance.transform))),
					}))
				)
			return new Map([['geometry', geometry(arrayInstances)]])
		},
	})

	registry.register<GroupGraphNode>({
		type: 'group',
		label: 'Group',
		creatable: true,
		create: (id, position) => new GroupGraphNode(id, position),
		ports: {
			inputs: geometryInput,
			outputs: geometryOutput,
		},
		serialize: () => ({}),
		deserialize: (id, position) => new GroupGraphNode(id, position),
		evaluate: (node, context) => {
			const instances = context.resolveInputs(node, 'geometry').flatMap((input, inputIndex) => {
				if (input.valueType !== 'geometry' || !isSceneMetadata(input.value)) return []
				return input.value.assetInstances.map((instance) => ({
					...instance,
					instanceId: `${node.id}/${inputIndex}/${instance.instanceId}`,
				}))
			})
			return new Map([['geometry', geometry(instances)]])
		},
	})

	registry.register<SumGraphNode>({
		type: 'sum',
		label: 'Sum',
		creatable: true,
		create: (id, position) => new SumGraphNode(id, position, 0, true),
		ports: {
			inputs: [
				{ id: 'enabled', valueType: 'boolean' },
				{ id: 'number', valueType: 'number', multiple: true },
			],
			outputs: [{ id: 'number', valueType: 'number' }],
			getInputDefault: (node, portId) =>
				portId === 'enabled' ? { valueType: 'boolean', value: node.getEnabled() } : undefined,
		},
		fields: {
			constant: numberField((node) => node.getConstant(), (node, value) => node.setConstant(value)),
			enabled: booleanField((node) => node.getEnabled(), (node, value) => node.setEnabled(value)),
		},
		serialize: (node) => ({
			constant: node.getConstant(),
			enabled: node.getEnabled(),
		}),
		deserialize: (id, position, data) => {
			const value = data as SumData
			return new SumGraphNode(id, position, value.constant, value.enabled)
		},
		evaluate: (node, context) => {
			const enabled = context.resolveInput(node, 'enabled')
			const initialValue = enabled?.valueType === 'boolean' && enabled.value === true
				? node.getConstant()
				: 0
			const total = context.resolveInputs(node, 'number').reduce((sum, input) => {
				return input?.valueType === 'number' && typeof input.value === 'number'
					? sum + input.value
					: sum
			}, initialValue)
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
		fields: transformFields('transform', (node) => node.getTransform()),
		serialize: (node) => ({
			graphId: node.getGraphId(),
			transform: node.getTransform().serialize(),
		}),
		deserialize: (id, position, data) => {
			const value = data as GraphInstanceData
			return new GraphInstanceGraphNode(
				id,
				position,
				value.graphId,
				new TransformField(value.transform)
			)
		},
	})

	return registry
}

export const defaultNodeRegistry = createDefaultNodeRegistry()
