import { Box3, Matrix4, Vector3 } from 'three'
import type {
	GeometryValue,
	NumberValue,
	MaterialInstanceValue,
	Vector3GraphValue,
	NodeEvaluationContext,
	GraphValue,
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
	ApplyMaterialGraphNode,
	type Axis,
	ChoiceToBooleanMapGraphNode,
	type ChoiceBooleanMapping,
	ChoiceToScalarMapGraphNode,
	type ChoiceScalarMapping,
	ChoiceToVector3MapGraphNode,
	type ChoiceVector3Mapping,
	type ChoiceMeshMapping,
	ChoiceToMeshMapGraphNode,
	GeometryToggleGraphNode,
	GetNthElementGraphNode,
	GraphInstanceGraphNode,
	type GraphNode,
	type PrimitiveArrayElementType,
	GroupGraphNode,
	InputGraphNode,
	InputReferenceGraphNode,
	MeshAssetGraphNode,
	StretchableAssetGraphNode,
	NumberAggregatorGraphNode,
	OutputGraphNode,
	PrimitiveGraphNode,
	RepeatInputGraphNode,
	RepeatOutputGraphNode,
	RotateAnimationHintGraphNode,
	type PrimitiveKind,
	SumGraphNode,
	MathExpressionGraphNode,
	TransformGraphNode,
	Vector3GraphNode,
	Vector3ComponentsGraphNode,
	type TransformOrigin,
} from '@/parametric/model/GraphNode'
import {
	evaluateMathExpression,
	getMathExpressionAvailableInputIndexes,
	getMathExpressionInputIndexes,
} from '@/parametric/model/MathExpression'
import { MaterialInstance } from '@/parametric/model/MaterialInstance'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { applyTransform } from '@/parametric/evaluation/applyTransform'
import {
	calculateSceneAxisAlignedBounds,
	setSceneAssetInstanceTransform,
} from '@/parametric/evaluation/SceneBounds'
import { TransformField, type TransformFieldSnapshot } from '@/parametric/model/fields/TransformField'
import type {
	GraphInputValue,
	GraphInputValueType,
} from '@/parametric/model/GraphDocumentModel'
import { StretchableAssetMetadata } from '@/parametric/model/StretchableAssetMetadata'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import { readStoredModelMeshBounds } from '@/models/ModelBoundsMetadata'

interface PrimitiveData {
	primitive: PrimitiveKind
	size: Vector3Snapshot
}

interface Vector3Data {
	value: Vector3Snapshot
}

interface ChoiceScalarMapData {
	mappings: ChoiceScalarMapping[]
}

interface ChoiceBooleanMapData {
	mappings: ChoiceBooleanMapping[]
}

interface ChoiceVector3MapData {
	mappings: ChoiceVector3Mapping[]
}

interface ChoiceMeshMapData {
	mappings: ChoiceMeshMapping[]
}

interface GeometryToggleData {
	enabled: boolean
}

interface RotateAnimationHintData {
	angle: number
	axis: Axis
	axisPosition: TransformOrigin
	offset: Vector3Snapshot
}

function parseChoiceMeshMappings(nodeId: string, data: unknown): ChoiceMeshMapping[] {
	const mappings = (data as Partial<ChoiceMeshMapData> | undefined)?.mappings
	if (
		!Array.isArray(mappings)
		|| mappings.some((mapping) => (
			!mapping
			|| typeof mapping !== 'object'
			|| typeof mapping.id !== 'string'
			|| !Number.isInteger(mapping.enumIndex)
			|| (mapping.enumIndex as number) < 0
		))
	) {
		throw new Error(
			`Cannot deserialize Choice to Mesh node "${nodeId}": data.mappings must be an array `
				+ `of { id: string, enumIndex: non-negative integer }. Received ${JSON.stringify(data)}`
		)
	}
	return mappings
}

interface MeshAssetData {
	meshId: string
	transform?: TransformFieldSnapshot
}

interface StretchableAssetData {
	meshId: string
	targetSize: Vector3Snapshot
	transform: TransformFieldSnapshot
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

interface InputData {
	valueType: GraphInputValueType
	value?: GraphInputValue
	exported: boolean
	enumId?: string
	elementType?: PrimitiveArrayElementType
}

interface InputReferenceData {
	inputId: string
}

interface ArrayData {
	countX: number
	countY: number
	countZ: number
	offsetX: number
	offsetY: number
	offsetZ: number
}

interface GraphInstanceData {
	graphId: string
	transform: TransformFieldSnapshot
	inputValues: Record<string, GraphInputValue>
}

interface SumData {
	constant: number
	enabled: boolean
}

interface MathExpressionData {
	expression: string
}

interface RepeatInputData {
	instances: number
}

interface RepeatOutputData {
	repeatInputId: string
}

interface NumberAggregatorData {
	initialValue: number
	addValue: number
}

interface GetNthElementData {
	index: number
	elementType: PrimitiveArrayElementType
}

const geometryInput = [{ id: 'geometry', valueType: 'geometry' }] as const
const geometryOutput = [{ id: 'geometry', valueType: 'geometry' }] as const
const defaultTransformData = TransformField.identitySnapshot()

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

function stretchPortAxis(portId: string): Axis | undefined {
	if (portId === 'stretchX') return 'x'
	if (portId === 'stretchY') return 'y'
	if (portId === 'stretchZ') return 'z'
	return undefined
}

function resolveStretchSize(
	context: NodeEvaluationContext,
	node: StretchableAssetGraphNode,
	portId: string,
	fallback: number
): number {
	const input = context.resolveInput(node, portId)
	return input?.valueType === 'number' && Number.isFinite(input.value)
		? input.value as number
		: fallback
}

function vector3(value: Vector3Snapshot): Vector3GraphValue {
	return { valueType: 'vector3', value: { ...value } }
}

function materialInstanceValue(materialId: string): MaterialInstanceValue {
	return { valueType: 'materialInstance', value: new MaterialInstance(materialId) }
}

function localInputValue(node: InputGraphNode): GraphValue | undefined {
	const value = node.getValue()
	if (value === undefined) return undefined
	if (node.getValueType() === 'materialInstance') {
		return typeof value === 'string'
			? { valueType: 'materialInstance', value: new MaterialInstance(value) }
			: undefined
	}
	return { valueType: node.getValueType(), value }
}

function resolveMaterial(context: NodeEvaluationContext, node: GraphNode) {
	const input = context.resolveInput(node, 'material')
	return input?.valueType === 'materialInstance' && input.value instanceof MaterialInstance
		? { materialId: input.value.materialId, color: input.value.color }
		: { materialId: 'plastic' }
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
		ports: {
			inputs: [{ id: 'material', valueType: 'materialInstance' }],
			outputs: geometryOutput,
			getInputDefault: () => materialInstanceValue('plastic'),
		},
		fields: {
			primitive: enumField(
				(node) => node.getPrimitive(),
				(node, value) => node.setPrimitive(value),
				() => ['box', 'sphere', 'cylinder', 'cone']
			),
			...vectorNumericFields('size', (node) => node.getSize(),
				(node, value) => node.setSize(value)),
		},
		defaultData: { primitive: 'box', size: { x: 1, y: 1, z: 1 } },
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
				boundsCenter: { x: 0, y: 0, z: 0 },
				transform: matrixSnapshot(new Matrix4()),
				bounds: calculateSceneAxisAlignedBounds(
					node.getSize().toSnapshot(),
					{ x: 0, y: 0, z: 0 },
					matrixSnapshot(new Matrix4())
				),
				originNode: context.getNodeInstanceReference(node.id),
				material: resolveMaterial(context, node),
			}])],
		]),
	})

	registry.register<Vector3GraphNode>({
		type: 'vector3',
		label: 'Vector3',
		creatable: true,
		create: (id, position) => new Vector3GraphNode(id, position),
		ports: {
			inputs: [
				{ id: 'x', valueType: 'number' },
				{ id: 'y', valueType: 'number' },
				{ id: 'z', valueType: 'number' },
			],
			outputs: [{ id: 'vector3', valueType: 'vector3' }],
			getInputDefault: (node, portId) => (
				portId === 'x' || portId === 'y' || portId === 'z'
					? { valueType: 'number', value: node.getValue()[portId] }
					: undefined
			),
		},
		fields: vectorNumericFields('value', (node) => node.getValue(), (node, value) => node.setValue(value)),
		serialize: (node) => ({ value: node.getValue().toSnapshot() }),
		deserialize: (id, position, data) => {
			const value = (data as Partial<Vector3Data> | undefined)?.value
			return new Vector3GraphNode(
				id,
				position,
				new Vector3Value(value?.x ?? 0, value?.y ?? 0, value?.z ?? 0)
			)
		},
		evaluate: (node, context) => {
			const local = node.getValue()
			const x = context.resolveInput(node, 'x')
			const y = context.resolveInput(node, 'y')
			const z = context.resolveInput(node, 'z')
			if (
				x?.valueType !== 'number' || typeof x.value !== 'number' || !Number.isFinite(x.value)
				|| y?.valueType !== 'number' || typeof y.value !== 'number' || !Number.isFinite(y.value)
				|| z?.valueType !== 'number' || typeof z.value !== 'number' || !Number.isFinite(z.value)
			) {
				return new Map([['vector3', vector3(local.toSnapshot())]])
			}
			return new Map([['vector3', vector3({ x: x.value, y: y.value, z: z.value })]])
		},
	})

	registry.register<Vector3ComponentsGraphNode>({
		type: 'vector3Components',
		label: 'Split XYZ',
		creatable: true,
		create: (id, position) => new Vector3ComponentsGraphNode(id, position),
		ports: {
			inputs: [{ id: 'vector3', valueType: 'vector3' }],
			outputs: [
				{ id: 'x', valueType: 'number' },
				{ id: 'y', valueType: 'number' },
				{ id: 'z', valueType: 'number' },
			],
		},
		serialize: () => ({}),
		deserialize: (id, position) => new Vector3ComponentsGraphNode(id, position),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'vector3')
			if (input?.valueType !== 'vector3') return new Map()
			const value = input.value as Vector3Snapshot
			return new Map([
				['x', number(value.x)],
				['y', number(value.y)],
				['z', number(value.z)],
			])
		},
	})

	registry.register<MathExpressionGraphNode>({
		type: 'mathExpression',
		label: 'Expression',
		aliases: ['math'],
		creatable: true,
		create: (id, position) => new MathExpressionGraphNode(id, position, '= $x'),
		ports: {
			inputs: (node) => getMathExpressionAvailableInputIndexes(node.getExpression())
				.map((index) => ({ id: String(index), valueType: 'number' })),
			outputs: [{ id: 'number', valueType: 'number' }],
		},
		fields: {
			expression: {
				kind: 'text',
				get: (node) => node.getExpression(),
				set: (node, value) => node.setExpression(value as string),
			},
		},
		defaultData: { expression: '= $x' },
		serialize: (node) => ({ expression: node.getExpression() }),
		deserialize: (id, position, data) => {
			const value = data as MathExpressionData
			if (typeof value?.expression !== 'string') {
				throw new Error(
					`Cannot deserialize Expression node "${id}": data.expression must be a string. `
					+ `Received ${JSON.stringify(data)}`
				)
			}
			return new MathExpressionGraphNode(id, position, value.expression)
		},
		evaluate: (node, context) => {
			const expression = node.getExpression()
			const values = new Map<number, number>()
			for (const inputIndex of getMathExpressionInputIndexes(expression)) {
				const input = context.resolveInput(node, String(inputIndex))
				if (
					input?.valueType !== 'number'
					|| typeof input.value !== 'number'
					|| !Number.isFinite(input.value)
				) {
					return new Map()
				}
				values.set(inputIndex, input.value)
			}
			const result = evaluateMathExpression(expression, values)
			return Number.isFinite(result) ? new Map([['number', number(result)]]) : new Map()
		},
	})

	registry.register<ChoiceToScalarMapGraphNode>({
		type: 'choiceToScalarMap',
		label: 'Map to Scalar',
		creatable: true,
		create: (id, position) => new ChoiceToScalarMapGraphNode(id, position, []),
		ports: {
			inputs: [{ id: 'enum', valueType: 'enum' }],
			outputs: [{ id: 'number', valueType: 'number' }],
		},
		defaultData: { mappings: [] },
		serialize: (node) => ({ mappings: node.getMappings() }),
		deserialize: (id, position, data) =>
			new ChoiceToScalarMapGraphNode(id, position, (data as ChoiceScalarMapData).mappings),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'enum')
			if (input?.valueType !== 'enum' || !Number.isInteger(input.value)) return new Map()
			const mappedNumber = node.getNumber(input.value as number)
			return mappedNumber === undefined
				? new Map()
				: new Map([['number', number(mappedNumber)]])
		},
	})

	registry.register<ChoiceToBooleanMapGraphNode>({
		type: 'choiceToBooleanMap',
		label: 'Map to Boolean',
		creatable: true,
		create: (id, position) => new ChoiceToBooleanMapGraphNode(id, position, []),
		ports: {
			inputs: [{ id: 'enum', valueType: 'enum' }],
			outputs: [{ id: 'boolean', valueType: 'boolean' }],
		},
		defaultData: { mappings: [] },
		serialize: (node) => ({ mappings: node.getMappings() }),
		deserialize: (id, position, data) =>
			new ChoiceToBooleanMapGraphNode(id, position, (data as ChoiceBooleanMapData).mappings),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'enum')
			if (input?.valueType !== 'enum' || !Number.isInteger(input.value)) return new Map()
			const mappedBoolean = node.getBoolean(input.value as number)
			return mappedBoolean === undefined
				? new Map()
				: new Map([['boolean', { valueType: 'boolean', value: mappedBoolean }]])
		},
	})

	registry.register<ChoiceToVector3MapGraphNode>({
		type: 'choiceToVector3Map',
		label: 'Map to Vector 3',
		creatable: true,
		create: (id, position) => new ChoiceToVector3MapGraphNode(id, position, []),
		ports: {
			inputs: [{ id: 'enum', valueType: 'enum' }],
			outputs: [{ id: 'vector3', valueType: 'vector3' }],
		},
		defaultData: { mappings: [] },
		serialize: (node) => ({ mappings: node.getMappings() }),
		deserialize: (id, position, data) =>
			new ChoiceToVector3MapGraphNode(id, position, (data as ChoiceVector3MapData).mappings),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'enum')
			if (input?.valueType !== 'enum' || !Number.isInteger(input.value)) return new Map()
			const mappedVector = node.getVector(input.value as number)
			return mappedVector === undefined
				? new Map()
				: new Map([['vector3', vector3(mappedVector)]])
		},
	})

	registry.register<ChoiceToMeshMapGraphNode>({
		type: 'choiceToMeshMap',
		label: 'Map to Mesh',
		creatable: true,
		create: (id, position) => new ChoiceToMeshMapGraphNode(id, position, [
			{ id: 'mesh-1', enumIndex: 0 },
			{ id: 'mesh-2', enumIndex: 1 },
		]),
		ports: {
			inputs: (node) => [
				{ id: 'enum', valueType: 'enum' },
				...node.getMappings().map((mapping) => ({
					id: mapping.id,
					valueType: 'geometry' as const,
				})),
			],
			outputs: geometryOutput,
		},
		defaultData: { mappings: [{ id: 'mesh-1', enumIndex: 0 }, { id: 'mesh-2', enumIndex: 1 }] },
		serialize: (node) => ({ mappings: node.getMappings() }),
		deserialize: (id, position, data) =>
			new ChoiceToMeshMapGraphNode(id, position, parseChoiceMeshMappings(id, data)),
		evaluate: (node, context) => {
			const choice = context.resolveInput(node, 'enum')
			if (choice?.valueType !== 'enum' || !Number.isInteger(choice.value)) return new Map()
			const inputId = node.getInputId(choice.value as number)
			if (!inputId) return new Map()
			const selectedGeometry = context.resolveInput(node, inputId)
			return selectedGeometry?.valueType === 'geometry' && isSceneMetadata(selectedGeometry.value)
				? new Map([['geometry', selectedGeometry]])
				: new Map()
		},
	})

	registry.register<GeometryToggleGraphNode>({
		type: 'geometryToggle',
		label: 'Toggle',
		creatable: true,
		create: (id, position) => new GeometryToggleGraphNode(id, position, true),
		ports: {
			inputs: [
				{ id: 'enabled', valueType: 'boolean' },
				...geometryInput,
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) =>
				portId === 'enabled' ? { valueType: 'boolean', value: node.getEnabled() } : undefined,
		},
		fields: {
			enabled: booleanField((node) => node.getEnabled(), (node, value) => node.setEnabled(value)),
		},
		defaultData: { enabled: true },
		serialize: (node) => ({ enabled: node.getEnabled() }),
		deserialize: (id, position, data) => {
			const value = data as GeometryToggleData
			if (typeof value?.enabled !== 'boolean') {
				throw new Error(
					`Cannot deserialize Geometry Toggle node "${id}": data.enabled must be a boolean. `
					+ `Received ${JSON.stringify(data)}`
				)
			}
			return new GeometryToggleGraphNode(id, position, value.enabled)
		},
		evaluate: (node, context) => {
			const enabled = context.resolveInput(node, 'enabled')
			if (enabled?.valueType !== 'boolean' || enabled.value !== true) {
				return new Map([['geometry', geometry([])]])
			}
			const input = context.resolveInput(node, 'geometry')
			return input?.valueType === 'geometry' && isSceneMetadata(input.value)
				? new Map([['geometry', input]])
				: new Map([['geometry', geometry([])]])
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
		ports: {
			inputs: [{ id: 'material', valueType: 'materialInstance' }],
			outputs: geometryOutput,
			getInputDefault: () => materialInstanceValue('plastic'),
		},
		fields: {
			meshId: enumField((node) => node.getMeshId(), (node, value) => node.setMeshId(value)),
			...transformFields('transform', (node) => node.getTransform()),
		},
		defaultData: { transform: defaultTransformData },
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
			if (!meshId) return new Map()
			const bounds = readStoredModelMeshBounds(meshId, context.getMeshMetadata(meshId) ?? {})
			const identity = matrixSnapshot(new Matrix4())
			const instances = [{
					instanceId: node.id,
					assetId: meshId,
					assetKind: 'catalog' as const,
					size: { x: bounds.x, y: bounds.y, z: bounds.z },
					boundsCenter: bounds.center,
					transform: identity,
					bounds: calculateSceneAxisAlignedBounds(
						{ x: bounds.x, y: bounds.y, z: bounds.z }, bounds.center, identity
					),
					originNode: context.getNodeInstanceReference(node.id),
					material: resolveMaterial(context, node),
				}]
			return new Map([['geometry', geometry(applyTransform(
				node.getTransform(), instances, (instance) => instance.instanceId
			))]])
		},
	})

	registry.register<StretchableAssetGraphNode>({
		type: 'stretchableAsset',
		label: 'Stretchable Asset',
		creatable: true,
		create: (id, position, { meshCatalog }) => {
			const meshId = meshCatalog.getMeshes().find((mesh) => {
				if (!mesh.selectable) return false
				const bounds = meshCatalog.getBounds(mesh.id)
				return Boolean(
					bounds && new StretchableAssetMetadata(
						mesh.id,
						bounds,
						meshCatalog.getMetadata(mesh.id) ?? {}
					).isStretchable()
				)
			})?.id
			const bounds = meshId ? meshCatalog.getBounds(meshId) : undefined
			if (!meshId || !bounds) {
				throw new Error(
					`Cannot create Stretchable Asset node "${id}": the active client mesh catalog `
					+ 'contains no selectable asset with computed bounds and at least one enabled stretch axis.'
				)
			}
			const metadata = new StretchableAssetMetadata(
				meshId,
				bounds,
				meshCatalog.getMetadata(meshId) ?? {}
			)
			return new StretchableAssetGraphNode(id, position, meshId, metadata.naturalSize)
		},
		ports: {
			inputs: (node, context) => [
				{ id: 'material', valueType: 'materialInstance' },
				...(context?.getStretchableAxes?.(node.getMeshId()) ?? ['x', 'y', 'z']).map((axis) => ({
					id: `stretch${axis.toUpperCase()}`,
					valueType: 'number' as const,
				})),
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) => {
				if (portId === 'material') return materialInstanceValue('plastic')
				const axis = stretchPortAxis(portId)
				return axis
					? { valueType: 'number', value: node.getTargetSize()[axis] }
					: undefined
			},
		},
		fields: {
			meshId: enumField((node) => node.getMeshId(), (node, value) => node.setMeshId(value)),
			...vectorNumericFields(
				'targetSize',
				(node) => node.getTargetSize(),
				(node, value) => node.setTargetSize(value)
			),
			...transformFields('transform', (node) => node.getTransform()),
		},
		defaultData: { transform: defaultTransformData },
		serialize: (node) => ({
			meshId: node.getMeshId(),
			targetSize: node.getTargetSize().toSnapshot(),
			transform: node.getTransform().serialize(),
		}),
		deserialize: (id, position, data) => {
			const value = data as StretchableAssetData
			if (
				typeof value?.meshId !== 'string'
				|| !Vector3Value.isSnapshot(value.targetSize)
				|| !value.transform
			) {
				throw new Error(
					`Cannot deserialize Stretchable Asset node "${id}": data must contain meshId, `
					+ `finite targetSize { x, y, z }, and transform. Received ${JSON.stringify(data)}.`
				)
			}
			return new StretchableAssetGraphNode(
				id,
				position,
				value.meshId,
				Vector3Value.from(value.targetSize),
				new TransformField(value.transform)
			)
		},
		evaluate: (node, context) => {
			const meshId = node.getMeshId()
			if (!meshId) {
				const reference = context.getNodeInstanceReference(node.id)
				throw new Error(
					`Cannot evaluate Stretchable Asset node "${node.id}" in graph "${reference.graphId}" `
					+ `(node instance "${reference.nodeInstanceId}"): mesh ID ${JSON.stringify(meshId)} `
					+ 'is empty.'
				)
			}
			const modelMetadata = context.getMeshMetadata(meshId) ?? {}
			const bounds = readStoredModelMeshBounds(meshId, modelMetadata)
			const metadata = new StretchableAssetMetadata(
				meshId,
				bounds,
				modelMetadata
			)
			const storedSize = node.getTargetSize()
			const requestedSize = new Vector3Value(
				resolveStretchSize(context, node, 'stretchX', storedSize.x),
				resolveStretchSize(context, node, 'stretchY', storedSize.y),
				resolveStretchSize(context, node, 'stretchZ', storedSize.z)
			)
			const targetSize = metadata.constrainTargetSize(requestedSize.toSnapshot())
			const identity = matrixSnapshot(new Matrix4())
			const boundsCenter = {
				x: (bounds.center.x - metadata.pivot.x) * targetSize.x / metadata.naturalSize.x,
				y: (bounds.center.y - metadata.pivot.y) * targetSize.y / metadata.naturalSize.y,
				z: (bounds.center.z - metadata.pivot.z) * targetSize.z / metadata.naturalSize.z,
			}
			const instances = [{
				instanceId: node.id,
				assetId: meshId,
				assetKind: 'catalog' as const,
				size: targetSize.toSnapshot(),
				boundsCenter,
				transform: identity,
				bounds: calculateSceneAxisAlignedBounds(targetSize.toSnapshot(), boundsCenter, identity),
				originNode: context.getNodeInstanceReference(node.id),
				material: resolveMaterial(context, node),
				deformation: {
					kind: 'stretch' as const,
					sourceSize: metadata.naturalSize.toSnapshot(),
					texelSizeRatio: metadata.texelSizeRatio,
					pivot: {
						x: metadata.pivot.x,
						y: metadata.pivot.y,
						z: metadata.pivot.z,
					},
					axes: metadata.stretchAxes.map((axis) => ({
						axis: axis.axis,
						boxes: axis.boxes.map((box) => ({ min: box.min, max: box.max })),
						textureAxis: axis.textureAxis,
					})),
				},
			}]
			return new Map([['geometry', geometry(applyTransform(
				node.getTransform(),
				instances,
				(instance) => instance.instanceId
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
		ports: {
			inputs: [
				{ id: 'enabled', valueType: 'boolean' },
				{ id: 'translation', valueType: 'vector3' },
				...geometryInput,
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) => {
				if (portId === 'enabled') return { valueType: 'boolean', value: node.getEnabled() }
				if (portId === 'translation') return vector3(node.getTranslation().toSnapshot())
				return undefined
			},
		},
		fields: {
			...transformFields('', (node) => node.getTransform()),
			copy: booleanField((node) => node.getCopy(), (node, value) => node.setCopy(value)),
			enabled: booleanField((node) => node.getEnabled(), (node, value) => node.setEnabled(value)),
		},
		bypass: { enabledInput: 'enabled', input: 'geometry', output: 'geometry' },
		defaultData: {
			...defaultTransformData,
			copy: false,
			uniformScale: true,
			enabled: true,
		},
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
			if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) {
				return new Map()
			}
			const translationInput = context.resolveInput(node, 'translation')
			const translation = translationInput?.valueType === 'vector3'
				&& Vector3Value.isSnapshot(translationInput.value)
				? translationInput.value
				: node.getTranslation().toSnapshot()
			const transform = new TransformField({
				...node.getTransform().serialize(),
				translation,
			})
			const instances = input.value.assetInstances
			const transformed = applyTransform(
				transform,
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

	registry.register<ApplyMaterialGraphNode>({
		type: 'applyMaterial',
		label: 'Apply Material',
		creatable: true,
		create: (id, position) => new ApplyMaterialGraphNode(id, position),
		ports: {
			inputs: [
				{ id: 'geometry', valueType: 'geometry' },
				{ id: 'material', valueType: 'materialInstance' },
			],
			outputs: geometryOutput,
		},
		serialize: () => ({}),
		deserialize: (id, position) => new ApplyMaterialGraphNode(id, position),
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			const material = context.resolveInput(node, 'material')
			const materialInstance = material?.value
			if (
				input?.valueType !== 'geometry'
				|| !isSceneMetadata(input.value)
				|| material?.valueType !== 'materialInstance'
				|| !(materialInstance instanceof MaterialInstance)
			) return new Map()

			return new Map([
				['geometry', geometry(input.value.assetInstances.map((instance) => ({
					...instance,
					instanceId: `${node.id}/${instance.instanceId}`,
					material: { materialId: materialInstance.materialId, color: materialInstance.color },
				})))],
			])
		},
	})

	registry.register<RotateAnimationHintGraphNode>({
		type: 'rotateAnimationHint',
		label: 'Rotate Animation Hint',
		creatable: true,
		create: (id, position) => new RotateAnimationHintGraphNode(
			id, position, 90, 'y', { x: 'min', y: 'middle', z: 'middle' }, new Vector3Value(0, 0, 0)
		),
		ports: {
			inputs: [...geometryInput, { id: 'offset', valueType: 'vector3' }],
			outputs: geometryOutput,
			getInputDefault: (node, portId) => portId === 'offset'
				? { valueType: 'vector3', value: node.getOffset().toSnapshot() }
				: undefined,
		},
		fields: {
			angle: numberField((node) => node.getAngle(), (node, value) => node.setAngle(value)),
			...vectorNumericFields('offset', (node) => node.getOffset(), (node, value) => node.setOffset(value)),
			axis: enumField((node) => node.getAxis(), (node, value) => node.setAxis(value), () => ['x', 'y', 'z']),
			...Object.fromEntries((['x', 'y', 'z'] as const).map((axis) => [
				`axisPosition.${axis}`,
				enumField(
					(node: RotateAnimationHintGraphNode) => node.getAxisPosition()[axis],
					(node: RotateAnimationHintGraphNode, value: TransformOrigin[typeof axis]) =>
						node.setAxisPosition({ ...node.getAxisPosition(), [axis]: value }),
					() => ['min', 'middle', 'max']
				),
			])),
		},
		defaultData: {
			angle: 90,
			offset: { x: 0, y: 0, z: 0 },
			axis: 'y',
			axisPosition: { x: 'min', y: 'middle', z: 'middle' },
		},
		serialize: (node) => ({
			angle: node.getAngle(),
			offset: node.getOffset().toSnapshot(),
			axis: node.getAxis(),
			axisPosition: node.getAxisPosition(),
		}),
		deserialize: (id, position, data) => {
			const value = data as RotateAnimationHintData
			return new RotateAnimationHintGraphNode(
				id, position, value.angle, value.axis, value.axisPosition, Vector3Value.from(value.offset)
			)
		},
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) return new Map()
			if (input.value.assetInstances.length === 0) {
				return new Map([['geometry', geometry([])]])
			}
			const bounds = input.value.assetInstances.reduce(
				(aggregate, instance) => aggregate.union(new Box3(
					new Vector3(instance.bounds.min.x, instance.bounds.min.y, instance.bounds.min.z),
					new Vector3(instance.bounds.max.x, instance.bounds.max.y, instance.bounds.max.z)
				)),
				new Box3()
			)
			const axisPosition = node.getAxisPosition()
			const offsetInput = context.resolveInput(node, 'offset')
			const offset = offsetInput?.valueType === 'vector3' && Vector3Value.isSnapshot(offsetInput.value)
				? offsetInput.value
				: node.getOffset().toSnapshot()
			const pivot = {
				x: getBoundsPosition(bounds.min.x, bounds.max.x, axisPosition.x) + offset.x,
				y: getBoundsPosition(bounds.min.y, bounds.max.y, axisPosition.y) + offset.y,
				z: getBoundsPosition(bounds.min.z, bounds.max.z, axisPosition.z) + offset.z,
			}
			const axisDirection = node.getAxis() === 'x'
				? { x: 1, y: 0, z: 0 }
				: node.getAxis() === 'y'
					? { x: 0, y: 1, z: 0 }
					: { x: 0, y: 0, z: 1 }
			return new Map([['geometry', geometry(input.value.assetInstances.map((instance) => ({
				...instance,
				instanceId: `${node.id}/${instance.instanceId}`,
				rotateAnimationHint: {
					angle: node.getAngle(),
					axisPosition,
					pivot,
					axisDirection,
				},
			})))]])
		},
	})

	registry.register<ArrayGraphNode>({
		type: 'array',
		label: 'Array',
		creatable: true,
		create: (id, position) => new ArrayGraphNode(id, position, 1, 1, 1, 0, 0, 0),
		ports: {
			inputs: [
				{ id: 'geometry', valueType: 'geometry' },
				{ id: 'countX', valueType: 'number' },
				{ id: 'countY', valueType: 'number' },
				{ id: 'countZ', valueType: 'number' },
				{ id: 'offsetX', valueType: 'number' },
				{ id: 'offsetY', valueType: 'number' },
				{ id: 'offsetZ', valueType: 'number' },
			],
			outputs: geometryOutput,
			getInputDefault: (node, portId) => {
				if (portId === 'countX') return { valueType: 'number', value: node.getCount('x') }
				if (portId === 'countY') return { valueType: 'number', value: node.getCount('y') }
				if (portId === 'countZ') return { valueType: 'number', value: node.getCount('z') }
				if (portId === 'offsetX') return { valueType: 'number', value: node.getOffset('x') }
				if (portId === 'offsetY') return { valueType: 'number', value: node.getOffset('y') }
				if (portId === 'offsetZ') return { valueType: 'number', value: node.getOffset('z') }
				return undefined
			},
		},
		fields: {
			countX: numberField((node) => node.getCount('x'), (node, value) => node.setCount('x', value)),
			countY: numberField((node) => node.getCount('y'), (node, value) => node.setCount('y', value)),
			countZ: numberField((node) => node.getCount('z'), (node, value) => node.setCount('z', value)),
			offsetX: numberField((node) => node.getOffset('x'), (node, value) => node.setOffset('x', value)),
			offsetY: numberField((node) => node.getOffset('y'), (node, value) => node.setOffset('y', value)),
			offsetZ: numberField((node) => node.getOffset('z'), (node, value) => node.setOffset('z', value)),
		},
		defaultData: { countX: 1, countY: 1, countZ: 1, offsetX: 0, offsetY: 0, offsetZ: 0 },
		serialize: (node) => ({
			countX: node.getCount('x'),
			countY: node.getCount('y'),
			countZ: node.getCount('z'),
			offsetX: node.getOffset('x'),
			offsetY: node.getOffset('y'),
			offsetZ: node.getOffset('z'),
		}),
		deserialize: (id, position, data) => {
			const value = data as ArrayData
			return new ArrayGraphNode(
				id, position, value.countX, value.countY, value.countZ,
				value.offsetX, value.offsetY, value.offsetZ
			)
		},
		evaluate: (node, context) => {
			const input = context.resolveInput(node, 'geometry')
			const countX = context.resolveInput(node, 'countX')
			const countY = context.resolveInput(node, 'countY')
			const countZ = context.resolveInput(node, 'countZ')
			const offsetX = context.resolveInput(node, 'offsetX')
			const offsetY = context.resolveInput(node, 'offsetY')
			const offsetZ = context.resolveInput(node, 'offsetZ')
			if (
				input?.valueType !== 'geometry'
				|| !isSceneMetadata(input.value)
				|| countX?.valueType !== 'number' || typeof countX.value !== 'number'
				|| countY?.valueType !== 'number' || typeof countY.value !== 'number'
				|| countZ?.valueType !== 'number' || typeof countZ.value !== 'number'
				|| offsetX?.valueType !== 'number' || typeof offsetX.value !== 'number'
				|| offsetY?.valueType !== 'number' || typeof offsetY.value !== 'number'
				|| offsetZ?.valueType !== 'number' || typeof offsetZ.value !== 'number'
			) return new Map()

			const countXValue = countX.value as number
			const countYValue = countY.value as number
			const countZValue = countZ.value as number
			const offsetXValue = offsetX.value as number
			const offsetYValue = offsetY.value as number
			const offsetZValue = offsetZ.value as number
			const instances = input.value.assetInstances
			const arrayInstances = instances.flatMap((instance) =>
					Array.from({ length: Math.max(1, Math.floor(countXValue)) }, (_, x) =>
						Array.from({ length: Math.max(1, Math.floor(countYValue)) }, (_, y) =>
							Array.from({ length: Math.max(1, Math.floor(countZValue)) }, (_, z) => {
								const transform = matrixSnapshot(new Matrix4()
									.makeTranslation(x * offsetXValue, y * offsetYValue, z * offsetZValue)
									.multiply(new Matrix4().fromArray(instance.transform)))
								return setSceneAssetInstanceTransform(
									instance,
									transform,
									`${node.id}/${x}:${y}:${z}/${instance.instanceId}`
								)
							})
						)
					)
				).flat(2)
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

	registry.register<RepeatInputGraphNode>({
		type: 'repeatInput',
		label: 'Repeat Zone',
		creatable: true,
		create: (id, position) => new RepeatInputGraphNode(id, position, 1),
		ports: {
			inputs: [{ id: 'instances', valueType: 'number' }],
			outputs: [{ id: 'iteration', valueType: 'number' }],
			getInputDefault: (node, portId) => portId === 'instances'
				? { valueType: 'number', value: node.getInstances() }
				: undefined,
		},
		fields: {
			instances: numberField(
				(node) => node.getInstances(),
				(node, value) => node.setInstances(value)
			),
		},
		defaultData: { instances: 1 },
		serialize: (node) => ({ instances: node.getInstances() }),
		deserialize: (id, position, data) => {
			const value = data as RepeatInputData
			if (!Number.isFinite(value?.instances)) {
				throw new Error(
					`Cannot deserialize Repeat Input node "${id}": data.instances must be a finite `
					+ `number. Received ${JSON.stringify(data)}.`
				)
			}
			return new RepeatInputGraphNode(id, position, value.instances)
		},
		evaluate: (node, context) => new Map([[
			'iteration',
			number(context.getRepeatIteration(node.id) ?? 0),
		]]),
	})

	registry.register<RepeatOutputGraphNode>({
		type: 'repeatOutput',
		label: 'Repeat Output',
		creatable: false,
		ports: {
			inputs: geometryInput,
			outputs: geometryOutput,
		},
		defaultData: { repeatInputId: '' },
		serialize: (node) => ({ repeatInputId: node.getRepeatInputId() }),
		deserialize: (id, position, data) => {
			const value = data as RepeatOutputData
			if (typeof value?.repeatInputId !== 'string') {
				throw new Error(
					`Cannot deserialize Repeat Output node "${id}": data.repeatInputId must be a `
					+ `string. Received ${JSON.stringify(data)}.`
				)
			}
			return new RepeatOutputGraphNode(id, position, value.repeatInputId)
		},
	})

	registry.register<NumberAggregatorGraphNode>({
		type: 'numberAggregator',
		label: 'Number Aggregator',
		creatable: true,
		create: (id, position) => new NumberAggregatorGraphNode(id, position, 0, 0),
		ports: {
			inputs: [
				{ id: 'initialValue', valueType: 'number' },
				{ id: 'addValue', valueType: 'number' },
			],
			outputs: [{ id: 'currentValue', valueType: 'number' }],
			getInputDefault: (node, portId) => {
				if (portId === 'initialValue') {
					return { valueType: 'number', value: node.getInitialValue() }
				}
				if (portId === 'addValue') {
					return { valueType: 'number', value: node.getAddValue() }
				}
				return undefined
			},
		},
		fields: {
			initialValue: numberField(
				(node) => node.getInitialValue(),
				(node, value) => node.setInitialValue(value)
			),
			addValue: numberField(
				(node) => node.getAddValue(),
				(node, value) => node.setAddValue(value)
			),
		},
		defaultData: { initialValue: 0, addValue: 0 },
		serialize: (node) => ({
			initialValue: node.getInitialValue(),
			addValue: node.getAddValue(),
		}),
		deserialize: (id, position, data) => {
			const value = data as NumberAggregatorData
			if (!Number.isFinite(value?.initialValue) || !Number.isFinite(value?.addValue)) {
				throw new Error(
					`Cannot deserialize Number Aggregator node "${id}": data.initialValue and `
					+ `data.addValue must be finite numbers. Received ${JSON.stringify(data)}.`
				)
			}
			return new NumberAggregatorGraphNode(
				id,
				position,
				value.initialValue,
				value.addValue
			)
		},
	})

	registry.register<GetNthElementGraphNode>({
		type: 'getNthElement',
		label: 'Get Nth Element',
		creatable: true,
		create: (id, position) => new GetNthElementGraphNode(id, position, 0, 'number'),
		ports: {
			inputs: [
				{ id: 'values', valueType: 'primitiveArray' },
				{ id: 'index', valueType: 'number' },
			],
			outputs: (node) => [{ id: 'value', valueType: node.getElementType() }],
			getInputDefault: (node, portId) => portId === 'index'
				? { valueType: 'number', value: node.getIndex() }
				: undefined,
		},
		fields: {
			index: numberField((node) => node.getIndex(), (node, value) => node.setIndex(value)),
			elementType: enumField(
				(node) => node.getElementType(),
				(node, value) => node.setElementType(value),
				() => ['number', 'boolean', 'enum']
			),
		},
		defaultData: { index: 0, elementType: 'number' },
		serialize: (node) => ({ index: node.getIndex(), elementType: node.getElementType() }),
		deserialize: (id, position, data) => {
			const value = data as GetNthElementData
			if (!Number.isFinite(value?.index) || !['number', 'boolean', 'enum'].includes(value?.elementType)) {
				throw new Error(
					`Cannot deserialize Get Nth Element node "${id}": data.index must be a finite number and `
					+ `data.elementType must be number, boolean, or enum. `
					+ `Received ${JSON.stringify(data)}.`
				)
			}
			return new GetNthElementGraphNode(id, position, value.index, value.elementType)
		},
		evaluate: (node, context) => {
			const values = context.resolveInput(node, 'values')
			const indexInput = context.resolveInput(node, 'index')
			if (
				values?.valueType !== 'primitiveArray'
				|| !Array.isArray(values.value)
				|| !values.value.every((item) => typeof item === 'boolean' || (
					typeof item === 'number' && Number.isFinite(item)
				))
			) return new Map()
			const index = indexInput?.valueType === 'number' && Number.isFinite(indexInput.value)
				? Math.max(0, Math.floor(indexInput.value as number))
				: node.getIndex()
			const value = values.value[index]
			if (value === undefined) return new Map()
			if (node.getElementType() === 'boolean' && typeof value === 'boolean') {
				return new Map([['value', { valueType: 'boolean', value }]])
			}
			if (node.getElementType() === 'enum' && Number.isInteger(value) && value >= 0) {
				return new Map([['value', { valueType: 'enum', value }]])
			}
			if (node.getElementType() === 'number' && typeof value === 'number' && Number.isFinite(value)) {
				return new Map([['value', number(value)]])
			}
			throw new Error(
				`Get Nth Element node "${node.id}" is configured to output ${node.getElementType()} but `
				+ `Values index ${index} contains ${JSON.stringify(value)}.`
			)
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
		defaultData: { constant: 0, enabled: true },
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

	registry.register<InputGraphNode>({
		type: 'input',
		label: 'Input',
		creatable: false,
		ports: {
			inputs: (node) => [
				{ id: 'value', valueType: node.getValueType() },
				...(node.getValueType() === 'materialInstance' ? [{ id: 'color', valueType: 'color' } as const] : []),
			],
			outputs: (node) => [{ id: 'value', valueType: node.getValueType() }],
			getOutputOptions: (node, portId, context) => {
				return portId === 'value' && node.getValueType() === 'enum'
					? context?.getEnumOptions(node.getEnumId() ?? '')
					: undefined
			},
		},
		serialize: (node) => ({
			valueType: node.getValueType(),
			value: node.getValue(),
			exported: node.isExported(),
			...(node.getEnumId() ? { enumId: node.getEnumId() } : {}),
			...(node.getPrimitiveArrayElementType() ? { elementType: node.getPrimitiveArrayElementType() } : {}),
		}),
		deserialize: (id, position, data) => {
			const value = data as InputData
			const supportedTypes: GraphInputValueType[] = [
				'number', 'primitiveArray', 'vector3', 'enum', 'materialInstance', 'color', 'boolean', 'geometry',
			]
			if (
				!value || !supportedTypes.includes(value.valueType)
				|| typeof value.exported !== 'boolean'
				|| (value.valueType === 'number' && !Number.isFinite(value.value))
				|| (value.valueType === 'primitiveArray' && (
					!Array.isArray(value.value)
					|| !['number', 'enum', 'boolean'].includes(value.elementType ?? '')
					|| value.value.some((item) => (
						(elementTypeIsNumber(value.elementType) && (typeof item !== 'number' || !Number.isFinite(item)))
						|| (value.elementType === 'boolean' && typeof item !== 'boolean')
					))
				))
				|| (value.valueType === 'vector3' && !Vector3Value.isSnapshot(value.value))
				|| (value.valueType === 'enum' && (!Number.isInteger(value.value) || !value.enumId))
				|| (value.valueType !== 'enum' && value.valueType !== 'primitiveArray' && value.enumId !== undefined)
				|| (value.valueType === 'materialInstance' && typeof value.value !== 'string')
				|| (value.valueType === 'color' && (
					typeof value.value !== 'string'
					|| !COLOR_PALETTE.some((color) => color.hex === value.value)
				))
				|| (value.valueType === 'boolean' && typeof value.value !== 'boolean')
			) {
				throw new Error(
					`Cannot deserialize Input node "${id}": invalid input data ${JSON.stringify(data)}.`
				)
			}
			return new InputGraphNode(
				id,
				position,
				value.valueType,
				value.value,
				value.exported,
				value.enumId,
				value.elementType
			)
		},
		evaluate: (node, context) => {
			const connectedValue = context.resolveInput(node, 'value')
			const baseValue = connectedValue ?? (node.isExported()
				? context.resolveGraphInput(node.id) ?? localInputValue(node)
				: localInputValue(node))
			if (!baseValue) return new Map()
			if (baseValue.valueType !== 'materialInstance' || !(baseValue.value instanceof MaterialInstance)) {
				return new Map([['value', baseValue]])
			}
			const color = context.resolveInput(node, 'color')
			return new Map([['value', {
				valueType: 'materialInstance',
				value: new MaterialInstance(
					baseValue.value.materialId,
					color?.valueType === 'color' && typeof color.value === 'string'
						? color.value
						: baseValue.value.color
				),
			}]])
		},
	})

	registry.register<InputReferenceGraphNode>({
		type: 'inputReference',
		label: 'Input Reference',
		creatable: false,
		ports: {
			outputs: (node, context) => {
				const input = context?.getGraphInterface(context.containingGraphId)?.inputs.find(
					(candidate) => candidate.id === node.getInputId()
				)
				return input ? [{ id: 'value', valueType: input.valueType }] : []
			},
			getOutputOptions: (node, portId, context) => {
				if (portId !== 'value') return undefined
				const input = context?.getGraphInterface(context.containingGraphId)?.inputs.find(
					(candidate) => candidate.id === node.getInputId()
				)
				return input?.valueType === 'enum'
					? context?.getEnumOptions(input.enumId ?? '')
					: undefined
			},
		},
		serialize: (node) => ({ inputId: node.getInputId() }),
		deserialize: (id, position, data) => {
			const value = data as Partial<InputReferenceData> | undefined
			if (!value || typeof value.inputId !== 'string' || !value.inputId.trim()) {
				throw new Error(
					`Cannot deserialize Input Reference node "${id}": data.inputId must be a non-empty string. `
					+ `Received ${JSON.stringify(data)}.`
				)
			}
			return new InputReferenceGraphNode(id, position, value.inputId)
		},
		evaluate: (node, context) => {
			const value = context.resolveGraphInput(node.getInputId())
			return value ? new Map([['value', value]]) : new Map()
		},
	})

	registry.register<GraphInstanceGraphNode>({
		type: 'graphInstance',
		label: 'Assembly Instance',
		creatable: false,
		ports: {
			inputs: (node, context) => [
				...(context?.getGraphInterface(node.getGraphId())?.inputs.map((input) => ({
					id: input.id,
					valueType: input.valueType,
				})) ?? []),
				{ id: 'translation', valueType: 'vector3' },
			],
			outputs: (node, context) => {
				const output = context?.getGraphInterface(node.getGraphId())?.output
				return output ? [{ id: output.id, valueType: output.valueType }] : []
			},
			getInputDefault: (node, portId) => portId === 'translation'
				? vector3(node.getTransform().getTranslation().toSnapshot())
				: undefined,
		},
		fields: transformFields('transform', (node) => node.getTransform()),
		defaultData: { transform: defaultTransformData },
		serialize: (node) => ({
			graphId: node.getGraphId(),
			transform: node.getTransform().serialize(),
			inputValues: node.getInputValues(),
		}),
		deserialize: (id, position, data) => {
			const value = data as GraphInstanceData
			const inputValues = parseGraphInstanceInputValues(id, value.inputValues)
			return new GraphInstanceGraphNode(
				id,
				position,
				value.graphId,
				new TransformField(value.transform),
				inputValues
			)
		},
	})

	return registry
}

function getBoundsPosition(
	min: number,
	max: number,
	position: TransformOrigin['x']
): number {
	return position === 'min' ? min : position === 'max' ? max : (min + max) / 2
}

function elementTypeIsNumber(elementType: PrimitiveArrayElementType | undefined): boolean {
	return elementType === 'number' || elementType === 'enum'
}

export const defaultNodeRegistry = createDefaultNodeRegistry()

function parseGraphInstanceInputValues(
	nodeId: string,
	value: unknown
): Record<string, GraphInputValue> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Graph instance node "${nodeId}" requires an inputValues object`)
	}
	const inputValues: Record<string, GraphInputValue> = {}
	for (const [inputId, inputValue] of Object.entries(value)) {
		const primitiveArrayValue = Array.isArray(inputValue)
			&& inputValue.every((item) => typeof item === 'boolean' || (
				typeof item === 'number' && Number.isFinite(item)
			))
		const vector3Value = Vector3Value.isSnapshot(inputValue)
		if (
			(typeof inputValue !== 'number' || !Number.isFinite(inputValue))
			&& typeof inputValue !== 'string'
			&& typeof inputValue !== 'boolean'
			&& !primitiveArrayValue
			&& !vector3Value
		) {
			throw new Error(
				`Graph instance node "${nodeId}" has invalid value for input "${inputId}"`
			)
		}
		inputValues[inputId] = vector3Value
			? { ...inputValue }
			: Array.isArray(inputValue) ? [...inputValue] : inputValue
	}
	return inputValues
}
