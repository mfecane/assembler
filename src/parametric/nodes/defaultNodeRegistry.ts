import { Matrix4, Vector3 } from 'three'
import type {
	GeometryValue,
	MeshArrayValue,
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
	GraphInstanceGraphNode,
	type GraphNode,
	type GraphValueType,
	GroupGraphNode,
	InputGraphNode,
	InputReferenceGraphNode,
	MeshArrayGraphNode,
	MeshAssetGraphNode,
	StretchableAssetGraphNode,
	MultiArrayGraphNode,
	OutputGraphNode,
	PinGraphNode,
	PrimitiveGraphNode,
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
import { TransformField, type TransformFieldSnapshot } from '@/parametric/model/fields/TransformField'
import type {
	GraphInputValue,
	GraphInputValueType,
} from '@/parametric/model/GraphDocumentModel'
import { StretchableAssetMetadata } from '@/parametric/model/StretchableAssetMetadata'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'

interface PrimitiveData {
	primitive: PrimitiveKind
	size: Vector3Snapshot
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

interface MultiArrayData {
	axis: Axis
	offset: number
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

interface PinData {
	valueType: GraphValueType
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

function meshArray(value: MeshArrayValue['value']): MeshArrayValue {
	return { valueType: 'meshArray', value }
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
			getInputDefault: (_node, portId) => (
				portId === 'x' || portId === 'y' || portId === 'z'
					? { valueType: 'number', value: 0 }
					: undefined
			),
		},
		serialize: () => ({}),
		deserialize: (id, position) => new Vector3GraphNode(id, position),
		evaluate: (node, context) => {
			const reference = context.getNodeInstanceReference(node.id)
			const x = context.resolveInput(node, 'x')
			const y = context.resolveInput(node, 'y')
			const z = context.resolveInput(node, 'z')
			if (
				x?.valueType !== 'number' || typeof x.value !== 'number' || !Number.isFinite(x.value)
				|| y?.valueType !== 'number' || typeof y.value !== 'number' || !Number.isFinite(y.value)
				|| z?.valueType !== 'number' || typeof z.value !== 'number' || !Number.isFinite(z.value)
			) {
				console.log(
					`[node-chain-debug] stage=vector3 graph="${reference.graphId}" `
					+ `node="${node.id}" x=${String(x?.value)} y=${String(y?.value)} `
					+ `z=${String(z?.value)} output=missing`
				)
				return new Map()
			}
			console.log(
				`[node-chain-debug] stage=vector3 graph="${reference.graphId}" `
				+ `node="${node.id}" output=(${x.value},${y.value},${z.value})`
			)
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

	registry.register<PinGraphNode>({
		type: 'pin',
		label: 'Pin',
		creatable: false,
		ports: {
			inputs: (node) => [{ id: 'value', valueType: node.getValueType(), multiple: false }],
			outputs: (node) => [{ id: 'value', valueType: node.getValueType() }],
		},
		serialize: (node) => ({ valueType: node.getValueType() }),
		deserialize: (id, position, data) => {
			const value = data as Partial<PinData> | undefined
			const supportedTypes: GraphValueType[] = [
				'geometry', 'meshArray', 'number', 'numberArray', 'vector3',
				'enum', 'materialInstance', 'color', 'boolean',
			]
			if (!value?.valueType || !supportedTypes.includes(value.valueType)) {
				throw new Error(
					`Cannot deserialize Pin node "${id}": data.valueType must be one of `
					+ `${JSON.stringify(supportedTypes)}. Received ${JSON.stringify(data)}.`
				)
			}
			return new PinGraphNode(id, position, value.valueType)
		},
		evaluate: (node, context) => {
			const value = context.resolveInput(node, 'value')
			return value ? new Map([['value', value]]) : new Map()
		},
	})

	registry.register<MathExpressionGraphNode>({
		type: 'mathExpression',
		label: 'Expression',
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
			const reference = context.getNodeInstanceReference(node.id)
			const expression = node.getExpression()
			const values = new Map<number, number>()
			for (const inputIndex of getMathExpressionInputIndexes(expression)) {
				const input = context.resolveInput(node, String(inputIndex))
				if (
					input?.valueType !== 'number'
					|| typeof input.value !== 'number'
					|| !Number.isFinite(input.value)
				) {
					console.log(
						`[node-chain-debug] stage=math graph="${reference.graphId}" node="${node.id}" `
						+ `expression=${JSON.stringify(expression)} input=${inputIndex} `
						+ `inputType=${input?.valueType ?? 'missing'} inputValue=${String(input?.value)} `
						+ 'output=missing'
					)
					return new Map()
				}
				values.set(inputIndex, input.value)
			}
			const result = evaluateMathExpression(expression, values)
			console.log(
				`[node-chain-debug] stage=math graph="${reference.graphId}" node="${node.id}" `
				+ `expression=${JSON.stringify(expression)} `
				+ `inputs="${[...values].map(([index, value]) => `${index}:${value}`).join(',')}" `
				+ `output=${Number.isFinite(result) ? result : 'missing'}`
			)
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
			const bounds = context.getMeshBounds(meshId)
			if (!meshId || !bounds) return new Map()
			const instances = [{
					instanceId: node.id,
					assetId: meshId,
					assetKind: 'catalog' as const,
					size: { x: bounds.x, y: bounds.y, z: bounds.z },
					boundsCenter: bounds.center,
					transform: matrixSnapshot(new Matrix4()),
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
			const bounds = context.getMeshBounds(meshId)
			if (!meshId || !bounds) {
				const reference = context.getNodeInstanceReference(node.id)
				throw new Error(
					`Cannot evaluate Stretchable Asset node "${node.id}" in graph "${reference.graphId}" `
					+ `(node instance "${reference.nodeInstanceId}"): mesh ID ${JSON.stringify(meshId)} `
					+ 'is empty, inaccessible for the active client, or has no computed bounds.'
				)
			}
			const metadata = new StretchableAssetMetadata(
				meshId,
				bounds,
				context.getMeshMetadata(meshId) ?? {}
			)
			const storedSize = node.getTargetSize()
			const requestedSize = new Vector3Value(
				resolveStretchSize(context, node, 'stretchX', storedSize.x),
				resolveStretchSize(context, node, 'stretchY', storedSize.y),
				resolveStretchSize(context, node, 'stretchZ', storedSize.z)
			)
			const targetSize = metadata.constrainTargetSize(requestedSize.toSnapshot())
			const instances = [{
				instanceId: node.id,
				assetId: meshId,
				assetKind: 'catalog' as const,
				size: targetSize.toSnapshot(),
				boundsCenter: {
					x: (bounds.center.x - metadata.pivot.x) * targetSize.x / metadata.naturalSize.x,
					y: (bounds.center.y - metadata.pivot.y) * targetSize.y / metadata.naturalSize.y,
					z: (bounds.center.z - metadata.pivot.z) * targetSize.z / metadata.naturalSize.z,
				},
				transform: matrixSnapshot(new Matrix4()),
				originNode: context.getNodeInstanceReference(node.id),
				material: resolveMaterial(context, node),
				deformation: {
					kind: 'stretch' as const,
					sourceSize: metadata.naturalSize.toSnapshot(),
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
			const reference = context.getNodeInstanceReference(node.id)
			const input = context.resolveInput(node, 'geometry')
			if (input?.valueType !== 'geometry' || !isSceneMetadata(input.value)) {
				console.log(
					`[node-chain-debug] stage=transform graph="${reference.graphId}" node="${node.id}" `
					+ `geometryType=${input?.valueType ?? 'missing'} output=missing`
				)
				return new Map()
			}
			const translationInput = context.resolveInput(node, 'translation')
			const translation = translationInput?.valueType === 'vector3'
				&& Vector3Value.isSnapshot(translationInput.value)
				? translationInput.value
				: node.getTranslation().toSnapshot()
			console.log(
				`[node-chain-debug] stage=transform graph="${reference.graphId}" node="${node.id}" `
				+ `geometryCount=${input.value.assetInstances.length} `
				+ `translationInputType=${translationInput?.valueType ?? 'missing'} `
				+ `translation=(${translation.x},${translation.y},${translation.z}) `
				+ `cloneInput=${node.getCopy()}`
			)
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
			console.log(
				`[node-chain-debug] stage=transform-output graph="${reference.graphId}" node="${node.id}" `
				+ `instances="${output.map((instance) => (
					`${instance.instanceId}:(${instance.transform[12]},${instance.transform[13]},${instance.transform[14]})`
				)).join(',')}"`
			)
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
							Array.from({ length: Math.max(1, Math.floor(countZValue)) }, (_, z) => ({
								...instance,
								instanceId: `${node.id}/${x}:${y}:${z}/${instance.instanceId}`,
								transform: matrixSnapshot(new Matrix4()
									.makeTranslation(x * offsetXValue, y * offsetYValue, z * offsetZValue)
									.multiply(new Matrix4().fromArray(instance.transform))),
							}))
						)
					)
				).flat(2)
			return new Map([['geometry', geometry(arrayInstances)]])
		},
	})

	registry.register<MeshArrayGraphNode>({
		type: 'meshArray',
		label: 'Mesh Array',
		creatable: true,
		create: (id, position) => new MeshArrayGraphNode(id, position),
		ports: {
			inputs: geometryInput,
			outputs: [{ id: 'meshes', valueType: 'meshArray' }],
		},
		serialize: () => ({}),
		deserialize: (id, position) => new MeshArrayGraphNode(id, position),
		evaluate: (node, context) => {
			const meshes = context.resolveInputs(node, 'geometry').flatMap((input, inputIndex) => {
				if (input.valueType !== 'geometry' || !isSceneMetadata(input.value)) return []
				return [{
					assetInstances: input.value.assetInstances.map((instance) => ({
						...instance,
						instanceId: `${node.id}/${inputIndex}/${instance.instanceId}`,
					})),
				}]
			})
			return new Map([['meshes', meshArray(meshes)]])
		},
	})

	registry.register<MultiArrayGraphNode>({
		type: 'multiArray',
		label: 'Multi Array',
		creatable: true,
		create: (id, position) => new MultiArrayGraphNode(id, position, 'x', 1),
		ports: {
			inputs: [
				{ id: 'meshes', valueType: 'meshArray' },
				{ id: 'counts', valueType: 'numberArray' },
			],
			outputs: geometryOutput,
		},
		fields: {
			offset: numberField((node) => node.getOffset(), (node, value) => node.setOffset(value)),
			axis: enumField(
				(node) => node.getAxis(),
				(node, value) => node.setAxis(value),
				() => ['x', 'y', 'z']
			),
		},
		defaultData: { axis: 'x', offset: 1 },
		serialize: (node) => ({ axis: node.getAxis(), offset: node.getOffset() }),
		deserialize: (id, position, data) => {
			const value = data as MultiArrayData
			return new MultiArrayGraphNode(id, position, value.axis, value.offset)
		},
		evaluate: (node, context) => {
			const meshes = context.resolveInput(node, 'meshes')
			const counts = context.resolveInput(node, 'counts')
			if (
				meshes?.valueType !== 'meshArray'
				|| !Array.isArray(meshes.value)
				|| !meshes.value.every(isSceneMetadata)
				|| counts?.valueType !== 'numberArray'
				|| !Array.isArray(counts.value)
				|| !counts.value.every((count) => typeof count === 'number' && Number.isFinite(count))
			) return new Map()
			if (meshes.value.length !== counts.value.length) {
				throw new Error(
					`Multi Array node "${node.id}" requires one count per mesh bundle. Received `
					+ `${meshes.value.length} mesh bundles and ${counts.value.length} counts: `
					+ `${JSON.stringify(counts.value)}.`
				)
			}
			const countValues = counts.value as number[]
			const translation = node.getAxis() === 'x'
				? new Vector3(node.getOffset(), 0, 0)
				: node.getAxis() === 'y'
					? new Vector3(0, node.getOffset(), 0)
					: new Vector3(0, 0, node.getOffset())
			let copyOffset = 0
			const instances = meshes.value.flatMap((mesh, meshIndex) => {
				const count = Math.max(0, Math.floor(countValues[meshIndex] as number))
				const copies = Array.from({ length: count }, (_, copyIndex) =>
					mesh.assetInstances.map((instance) => ({
						...instance,
						instanceId: `${node.id}/${meshIndex}/${copyIndex}/${instance.instanceId}`,
						transform: matrixSnapshot(new Matrix4()
							.makeTranslation(
								translation.x * (copyOffset + copyIndex),
								translation.y * (copyOffset + copyIndex),
								translation.z * (copyOffset + copyIndex)
							)
							.multiply(new Matrix4().fromArray(instance.transform))),
					}))
				).flat()
				copyOffset += count
				return copies
			})
			return new Map([['geometry', geometry(instances)]])
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
			inputs: (node) => node.getValueType() === 'materialInstance'
				? [{ id: 'color', valueType: 'color' }]
				: [],
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
		}),
		deserialize: (id, position, data) => {
			const value = data as InputData
			const supportedTypes: GraphInputValueType[] = [
				'number', 'numberArray', 'vector3', 'enum', 'materialInstance', 'color', 'boolean', 'geometry',
			]
			if (
				!value || !supportedTypes.includes(value.valueType)
				|| typeof value.exported !== 'boolean'
				|| (value.valueType === 'number' && !Number.isFinite(value.value))
				|| (value.valueType === 'vector3' && !Vector3Value.isSnapshot(value.value))
				|| (value.valueType === 'enum' && (!Number.isInteger(value.value) || !value.enumId))
				|| (value.valueType !== 'enum' && value.enumId !== undefined)
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
				value.enumId
			)
		},
		evaluate: (node, context) => {
			const baseValue = node.isExported()
				? context.resolveGraphInput(node.id) ?? localInputValue(node)
				: localInputValue(node)
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
		const numberArrayValue = Array.isArray(inputValue)
			&& inputValue.every((item) => typeof item === 'number' && Number.isFinite(item))
		const vector3Value = Vector3Value.isSnapshot(inputValue)
		if (
			(typeof inputValue !== 'number' || !Number.isFinite(inputValue))
			&& typeof inputValue !== 'string'
			&& typeof inputValue !== 'boolean'
			&& !numberArrayValue
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
