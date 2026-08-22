import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { BooleanField } from '@/parametric/model/fields/BooleanField'
import { EnumField } from '@/parametric/model/fields/EnumField'
import { NumberField } from '@/parametric/model/fields/NumberField'
import { TransformField } from '@/parametric/model/fields/TransformField'
import type {
	GraphInputValue,
	GraphInputValueType,
} from '@/parametric/model/GraphDocumentModel'
import { validateMathExpression } from '@/parametric/model/MathExpression'

export interface GraphPoint {
	x: number
	y: number
}

export type GraphNodeType = string
export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone'
export type Axis = 'x' | 'y' | 'z'
export type OriginAxis = 'min' | 'middle' | 'max'
export type GraphValueType =
	| 'geometry'
	| 'number'
	| 'primitiveArray'
	| 'vector3'
	| 'enum'
	| 'materialInstance'
	| 'color'
	| 'boolean'

export interface GraphInputPort {
	id: string
	valueType: GraphValueType
	multiple?: boolean
}

export interface GraphOutputPort {
	id: string
	valueType: GraphValueType
}

export interface GraphInputDefault {
	valueType: GraphValueType
	value: unknown
}

export interface ChoiceScalarMapping {
	enumIndex: number
	value: number
}

export interface ChoiceBooleanMapping {
	enumIndex: number
	value: boolean
}

export interface ChoiceVector3Mapping {
	enumIndex: number
	value: Vector3Snapshot
}

export interface ChoiceMeshMapping {
	id: string
	enumIndex: number
}

export interface TransformOrigin {
	x: OriginAxis
	y: OriginAxis
	z: OriginAxis
}

export abstract class GraphNode {
	public abstract readonly type: GraphNodeType
	private name = ''

	protected constructor(
		public readonly id: string,
		private position: GraphPoint
	) {}

	public getPosition(): GraphPoint {
		return { ...this.position }
	}

	public setPosition(position: GraphPoint): void {
		this.position = { ...position }
	}

	public getName(): string {
		return this.name
	}

	public setName(name: string): void {
		this.name = name.trim()
	}

}

export interface TransformableGraphNode extends GraphNode {
	getTransform(): TransformField
}

export function isTransformableGraphNode(
	node: GraphNode | undefined | null
): node is TransformableGraphNode {
	return Boolean(node && 'getTransform' in node && typeof node.getTransform === 'function')
}

export class PrimitiveGraphNode extends GraphNode {
	public readonly type = 'primitive'
	private readonly primitiveField: EnumField<PrimitiveKind>

	public constructor(
		id: string,
		position: GraphPoint,
		primitive: PrimitiveKind,
		private size: Vector3Value
	) {
		super(id, position)
		this.primitiveField = new EnumField(primitive, ['box', 'sphere', 'cylinder', 'cone'])
	}

	public getPrimitive(): PrimitiveKind {
		return this.primitiveField.get()
	}

	public setPrimitive(primitive: PrimitiveKind): void {
		this.primitiveField.set(primitive)
	}

	public getSize(): Vector3Value {
		return this.size
	}

	public setSize(size: Vector3Value): void {
		this.size = size
	}

}

export class InputGraphNode extends GraphNode {
	public readonly type = 'input'

	public constructor(
		id: string,
		position: GraphPoint,
		private valueType: GraphInputValueType,
		private value: GraphInputValue | undefined,
		private exported: boolean,
		private enumId?: string,
		private primitiveArrayElementType?: PrimitiveArrayElementType
	) {
		super(id, position)
		this.setValue(value)
	}

	public getValueType(): GraphInputValueType { return this.valueType }
	public getValue(): GraphInputValue | undefined {
		if (Array.isArray(this.value)) return [...this.value]
		return Vector3Value.isSnapshot(this.value) ? { ...this.value } : this.value
	}
	public setValue(value: GraphInputValue | undefined): void {
		const valid = this.valueType === 'geometry'
			? value === undefined
			: this.valueType === 'number'
				? typeof value === 'number' && Number.isFinite(value)
				: this.valueType === 'primitiveArray'
						? Array.isArray(value) && value.every(isPrimitiveArrayElement)
					: this.valueType === 'vector3'
						? Vector3Value.isSnapshot(value)
					: this.valueType === 'enum'
						? Number.isInteger(value) && (value as number) >= 0 && Boolean(this.enumId)
						: this.valueType === 'materialInstance'
							? typeof value === 'string' && value.trim().length > 0
							: this.valueType === 'color'
								? typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
								: typeof value === 'boolean'
		if (!valid) {
			throw new Error(
				`Input node "${this.id}" requires a valid ${this.valueType} local value. `
				+ `Received ${JSON.stringify(value)} with enum ID ${JSON.stringify(this.enumId)}.`
			)
		}
		this.value = Array.isArray(value)
			? [...value]
			: Vector3Value.isSnapshot(value)
				? { ...value }
				: value
	}
	public isExported(): boolean { return this.exported }
	public setExported(exported: boolean): void { this.exported = exported }
	public getEnumId(): string | undefined { return this.enumId }
	public setEnumId(enumId: string): void { this.enumId = enumId }
	public getPrimitiveArrayElementType(): PrimitiveArrayElementType | undefined {
		return this.primitiveArrayElementType
	}
	public setPrimitiveArrayElementType(elementType: PrimitiveArrayElementType): void {
		if (this.valueType !== 'primitiveArray') {
			throw new Error(`Input node "${this.id}" is not a primitive array.`)
		}
		this.primitiveArrayElementType = elementType
	}
}

export type PrimitiveArrayElementType = 'number' | 'boolean' | 'enum'

function isPrimitiveArrayElement(value: unknown): value is number | boolean {
	return typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean'
}

export class InputReferenceGraphNode extends GraphNode {
	public readonly type = 'inputReference'

	public constructor(
		id: string,
		position: GraphPoint,
		private inputId: string
	) {
		super(id, position)
	}

	public getInputId(): string {
		return this.inputId
	}

	public setInputId(inputId: string): void {
		this.inputId = inputId
	}
}

export class Vector3GraphNode extends GraphNode {
	public readonly type = 'vector3'
	private value: Vector3Value

	public constructor(id: string, position: GraphPoint, value = new Vector3Value(0, 0, 0)) {
		super(id, position)
		this.value = value
	}

	public getValue(): Vector3Value {
		return this.value
	}

	public setValue(value: Vector3Value): void {
		this.value = value
	}
}

export class Vector3ComponentsGraphNode extends GraphNode {
	public readonly type = 'vector3Components'

	public constructor(id: string, position: GraphPoint) {
		super(id, position)
	}
}

export class ChoiceToScalarMapGraphNode extends GraphNode {
	public readonly type = 'choiceToScalarMap'

	public constructor(
		id: string,
		position: GraphPoint,
		private mappings: ChoiceScalarMapping[]
	) {
		super(id, position)
		this.mappings = ChoiceToScalarMapGraphNode.validateMappings(id, mappings)
	}

	public getMappings(): ChoiceScalarMapping[] {
		return this.mappings.map((mapping) => ({ ...mapping }))
	}

	public setMappings(mappings: ChoiceScalarMapping[]): void {
		this.mappings = ChoiceToScalarMapGraphNode.validateMappings(this.id, mappings)
	}

	public getNumber(enumIndex: number): number | undefined {
		return this.mappings.find((mapping) => mapping.enumIndex === enumIndex)?.value
	}

	private static validateMappings(nodeId: string, mappings: ChoiceScalarMapping[]): ChoiceScalarMapping[] {
		if (!Array.isArray(mappings) || mappings.some((mapping) => (
			!Number.isInteger(mapping?.enumIndex)
			|| mapping.enumIndex < 0
			|| !Number.isFinite(mapping.value)
		))) {
			throw new Error(
				`Choice to Scalar node "${nodeId}" requires mappings with non-negative integer `
				+ `enumIndex values and finite numbers. Received ${JSON.stringify(mappings)}`
			)
		}
		if (new Set(mappings.map((mapping) => mapping.enumIndex)).size !== mappings.length) {
			throw new Error(
				`Choice to Scalar node "${nodeId}" requires unique enumIndex values. `
				+ `Received ${JSON.stringify(mappings)}`
			)
		}
		return mappings.map((mapping) => ({ ...mapping }))
	}
}

export class ChoiceToBooleanMapGraphNode extends GraphNode {
	public readonly type = 'choiceToBooleanMap'

	public constructor(
		id: string,
		position: GraphPoint,
		private mappings: ChoiceBooleanMapping[]
	) {
		super(id, position)
		this.mappings = ChoiceToBooleanMapGraphNode.validateMappings(id, mappings)
	}

	public getMappings(): ChoiceBooleanMapping[] {
		return this.mappings.map((mapping) => ({ ...mapping }))
	}

	public setMappings(mappings: ChoiceBooleanMapping[]): void {
		this.mappings = ChoiceToBooleanMapGraphNode.validateMappings(this.id, mappings)
	}

	public getBoolean(enumIndex: number): boolean | undefined {
		return this.mappings.find((mapping) => mapping.enumIndex === enumIndex)?.value
	}

	private static validateMappings(nodeId: string, mappings: ChoiceBooleanMapping[]): ChoiceBooleanMapping[] {
		if (!Array.isArray(mappings) || mappings.some((mapping) => (
			!Number.isInteger(mapping?.enumIndex)
			|| mapping.enumIndex < 0
			|| typeof mapping.value !== 'boolean'
		))) {
			throw new Error(
				`Choice to Boolean node "${nodeId}" requires mappings with non-negative integer `
				+ `enumIndex values and booleans. Received ${JSON.stringify(mappings)}`
			)
		}
		if (new Set(mappings.map((mapping) => mapping.enumIndex)).size !== mappings.length) {
			throw new Error(
				`Choice to Boolean node "${nodeId}" requires unique enumIndex values. `
				+ `Received ${JSON.stringify(mappings)}`
			)
		}
		return mappings.map((mapping) => ({ ...mapping }))
	}
}

export class ChoiceToVector3MapGraphNode extends GraphNode {
	public readonly type = 'choiceToVector3Map'

	public constructor(
		id: string,
		position: GraphPoint,
		private mappings: ChoiceVector3Mapping[]
	) {
		super(id, position)
		this.mappings = ChoiceToVector3MapGraphNode.validateMappings(id, mappings)
	}

	public getMappings(): ChoiceVector3Mapping[] {
		return this.mappings.map((mapping) => ({ ...mapping, value: { ...mapping.value } }))
	}

	public setMappings(mappings: ChoiceVector3Mapping[]): void {
		this.mappings = ChoiceToVector3MapGraphNode.validateMappings(this.id, mappings)
	}

	public getVector(enumIndex: number): Vector3Snapshot | undefined {
		const value = this.mappings.find((mapping) => mapping.enumIndex === enumIndex)?.value
		return value ? { ...value } : undefined
	}

	private static validateMappings(
		nodeId: string,
		mappings: ChoiceVector3Mapping[]
	): ChoiceVector3Mapping[] {
		if (!Array.isArray(mappings) || mappings.some((mapping) => (
			!Number.isInteger(mapping?.enumIndex)
			|| mapping.enumIndex < 0
			|| !Vector3Value.isSnapshot(mapping.value)
		))) {
			throw new Error(
				`Choice to Vector 3 node "${nodeId}" requires mappings with non-negative integer `
				+ `enumIndex values and finite { x, y, z } vectors. Received ${JSON.stringify(mappings)}`
			)
		}
		if (new Set(mappings.map((mapping) => mapping.enumIndex)).size !== mappings.length) {
			throw new Error(
				`Choice to Vector 3 node "${nodeId}" requires unique enumIndex values. `
				+ `Received ${JSON.stringify(mappings)}`
			)
		}
		return mappings.map((mapping) => ({ ...mapping, value: { ...mapping.value } }))
	}
}

export class ChoiceToMeshMapGraphNode extends GraphNode {
	public readonly type = 'choiceToMeshMap'
	private mappings: ChoiceMeshMapping[]

	public constructor(
		id: string,
		position: GraphPoint,
		mappings: ChoiceMeshMapping[]
	) {
		super(id, position)
		this.mappings = ChoiceToMeshMapGraphNode.validateMappings(id, mappings)
	}

	public getMappings(): ChoiceMeshMapping[] {
		return this.mappings.map((mapping) => ({ ...mapping }))
	}

	public setMappings(mappings: ChoiceMeshMapping[]): void {
		this.mappings = ChoiceToMeshMapGraphNode.validateMappings(this.id, mappings)
	}

	public getInputId(enumIndex: number): string | undefined {
		return this.mappings.find((mapping) => mapping.enumIndex === enumIndex)?.id
	}

	private static validateMappings(nodeId: string, mappings: ChoiceMeshMapping[]): ChoiceMeshMapping[] {
		if (mappings.length === 0) {
			throw new Error(`Choice to Mesh node "${nodeId}" requires at least one mapping`)
		}
		const normalized = mappings.map((mapping, index) => {
			const id = mapping.id.trim()
			const enumIndex = mapping.enumIndex
			if (!id || !Number.isInteger(enumIndex) || enumIndex < 0) {
				throw new Error(
					`Choice to Mesh node "${nodeId}" mapping ${index + 1} requires a non-empty `
					+ `input ID and a non-negative integer choice index. Received ${JSON.stringify(mapping)}`
				)
			}
			return { id, enumIndex }
		})
		const inputIds = normalized.map((mapping) => mapping.id)
		const enumIndices = normalized.map((mapping) => mapping.enumIndex)
		if (
			inputIds.includes('enum')
			|| new Set(inputIds).size !== inputIds.length
			|| new Set(enumIndices).size !== enumIndices.length
		) {
			throw new Error(
				`Choice to Mesh node "${nodeId}" requires unique input IDs other than "enum" `
				+ 'and unique choice indices. '
				+ `Received ${JSON.stringify(normalized)}`
			)
		}
		return normalized
	}
}

export class GeometryToggleGraphNode extends GraphNode {
	public readonly type = 'geometryToggle'
	private readonly enabledField: BooleanField

	public constructor(id: string, position: GraphPoint, enabled: boolean) {
		super(id, position)
		this.enabledField = new BooleanField(enabled)
	}

	public getEnabled(): boolean {
		return this.enabledField.get()
	}

	public setEnabled(enabled: boolean): void {
		this.enabledField.set(enabled)
	}
}

export class MeshAssetGraphNode extends GraphNode {
	public readonly type = 'meshAsset'
	private readonly meshIdField: EnumField
	private readonly transform: TransformField

	public constructor(
		id: string,
		position: GraphPoint,
		meshId: string,
		transform = new TransformField()
	) {
		super(id, position)
		this.meshIdField = new EnumField(meshId, [meshId], '')
		this.transform = transform
	}

	public getMeshId(): string {
		return this.meshIdField.get()
	}

	public setMeshId(meshId: string): void {
		this.meshIdField.setOptions([...this.meshIdField.getOptions(), meshId])
		this.meshIdField.set(meshId)
	}

	public getTransform(): TransformField { return this.transform }
}

export class StretchableAssetGraphNode extends GraphNode {
	public readonly type = 'stretchableAsset'
	private readonly meshIdField: EnumField
	private targetSize: Vector3Value
	private readonly transform: TransformField

	public constructor(
		id: string,
		position: GraphPoint,
		meshId: string,
		targetSize: Vector3Value,
		transform = new TransformField()
	) {
		super(id, position)
		this.meshIdField = new EnumField(meshId, [meshId], '')
		this.targetSize = targetSize
		this.transform = transform
	}

	public getMeshId(): string { return this.meshIdField.get() }
	public setMeshId(meshId: string): void {
		this.meshIdField.setOptions([...this.meshIdField.getOptions(), meshId])
		this.meshIdField.set(meshId)
	}

	public setMesh(meshId: string, naturalSize: Vector3Value): void {
		this.setMeshId(meshId)
		this.targetSize = naturalSize
	}

	public getTargetSize(): Vector3Value { return this.targetSize }
	public setTargetSize(targetSize: Vector3Value): void { this.targetSize = targetSize }
	public getTransform(): TransformField { return this.transform }
}

export class TransformGraphNode extends GraphNode {
	public readonly type = 'transform'
	private readonly transform: TransformField
	private readonly copyField: BooleanField
	private readonly uniformScaleField: BooleanField
	private readonly enabledField: BooleanField

	public constructor(
		id: string,
		position: GraphPoint,
		translation: Vector3Value,
		rotation: Vector3Value,
		scale: Vector3Value,
		origin: TransformOrigin,
		copy: boolean,
		uniformScale: boolean,
		enabled = true
	) {
		super(id, position)
		this.transform = new TransformField({
			translation: translation.toSnapshot(),
			rotation: rotation.toSnapshot(),
			scale: scale.toSnapshot(),
			origin,
		})
		this.copyField = new BooleanField(copy)
		this.uniformScaleField = new BooleanField(uniformScale)
		this.enabledField = new BooleanField(enabled)
	}

	public getTranslation(): Vector3Value {
		return this.transform.getTranslation()
	}

	public setTranslation(translation: Vector3Value): void {
		this.transform.setTranslation(translation)
	}

	public getRotation(): Vector3Value {
		return this.transform.getRotation()
	}

	public setRotation(rotation: Vector3Value): void {
		this.transform.setRotation(rotation)
	}

	public getScale(): Vector3Value {
		return this.transform.getScale()
	}

	public setScale(scale: Vector3Value): void {
		this.transform.setScale(scale)
	}

	public getOrigin(): TransformOrigin {
		return this.transform.getOrigin()
	}

	public setOrigin(origin: TransformOrigin): void {
		this.transform.setOrigin(origin)
	}

	public getCopy(): boolean {
		return this.copyField.get()
	}

	public setCopy(copy: boolean): void {
		this.copyField.set(copy)
	}

	public getUniformScale(): boolean {
		return this.uniformScaleField.get()
	}

	public setUniformScale(uniformScale: boolean): void {
		this.uniformScaleField.set(uniformScale)
		if (uniformScale) {
			const scale = this.transform.getScale()
			this.transform.setScale(new Vector3Value(scale.x, scale.x, scale.x))
		}
	}

	public getEnabled(): boolean { return this.enabledField.get() }
	public setEnabled(enabled: boolean): void { this.enabledField.set(enabled) }
	public getTransform(): TransformField { return this.transform }

}

export class ApplyMaterialGraphNode extends GraphNode {
	public readonly type = 'applyMaterial'

	public constructor(id: string, position: GraphPoint) {
		super(id, position)
	}
}

export class RotateAnimationHintGraphNode extends GraphNode {
	public readonly type = 'rotateAnimationHint'
	private readonly angleField: NumberField
	private readonly axisField: EnumField<Axis>
	private axisPosition: TransformOrigin
	private offset: Vector3Value

	public constructor(
		id: string,
		position: GraphPoint,
		angle: number,
		axis: Axis,
		axisPosition: TransformOrigin,
		offset: Vector3Value
	) {
		super(id, position)
		this.angleField = new NumberField(angle)
		this.axisField = new EnumField(axis, ['x', 'y', 'z'])
		this.axisPosition = { ...axisPosition }
		this.offset = offset
	}

	public getAngle(): number { return this.angleField.get() }
	public setAngle(value: number): void { this.angleField.set(value) }
	public getAxis(): Axis { return this.axisField.get() }
	public setAxis(value: Axis): void { this.axisField.set(value) }
	public getAxisPosition(): TransformOrigin { return { ...this.axisPosition } }
	public setAxisPosition(value: TransformOrigin): void { this.axisPosition = { ...value } }
	public getOffset(): Vector3Value { return this.offset }
	public setOffset(value: Vector3Value): void { this.offset = value }
}

export class ArrayGraphNode extends GraphNode {
	public readonly type = 'array'
	private readonly countXField: NumberField
	private readonly countYField: NumberField
	private readonly countZField: NumberField
	private readonly offsetXField: NumberField
	private readonly offsetYField: NumberField
	private readonly offsetZField: NumberField

	public constructor(
		id: string,
		position: GraphPoint,
		countX: number,
		countY: number,
		countZ: number,
		offsetX: number,
		offsetY: number,
		offsetZ: number
	) {
		super(id, position)
		const normalizeCount = (value: number) =>
			Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1
		this.countXField = new NumberField(countX, normalizeCount)
		this.countYField = new NumberField(countY, normalizeCount)
		this.countZField = new NumberField(countZ, normalizeCount)
		this.offsetXField = new NumberField(offsetX)
		this.offsetYField = new NumberField(offsetY)
		this.offsetZField = new NumberField(offsetZ)
	}

	public getCount(axis: Axis): number {
		if (axis === 'x') return this.countXField.get()
		if (axis === 'y') return this.countYField.get()
		return this.countZField.get()
	}

	public setCount(axis: Axis, count: number): void {
		if (axis === 'x') this.countXField.set(count)
		else if (axis === 'y') this.countYField.set(count)
		else this.countZField.set(count)
	}

	public getOffset(axis: Axis): number {
		if (axis === 'x') return this.offsetXField.get()
		if (axis === 'y') return this.offsetYField.get()
		return this.offsetZField.get()
	}

	public setOffset(axis: Axis, offset: number): void {
		if (axis === 'x') this.offsetXField.set(offset)
		else if (axis === 'y') this.offsetYField.set(offset)
		else this.offsetZField.set(offset)
	}

}

export class OutputGraphNode extends GraphNode {
	public readonly type = 'graphOutput'

	public constructor(id: string, position: GraphPoint) {
		super(id, position)
	}

}

export class GraphInstanceGraphNode extends GraphNode {
	public readonly type = 'graphInstance'
	private readonly transform: TransformField
	private inputValues: Record<string, GraphInputValue>

	public constructor(
		id: string,
		position: GraphPoint,
		private readonly graphId: string,
		transform = new TransformField(),
		inputValues: Record<string, GraphInputValue> = {}
	) {
		super(id, position)
		this.transform = transform
		this.inputValues = copyGraphInputValues(inputValues)
	}

	public getGraphId(): string {
		return this.graphId
	}

	public getTransform(): TransformField { return this.transform }

	public getInputValue(inputId: string): GraphInputValue | undefined {
		const value = this.inputValues[inputId]
		return copyGraphInputValue(value)
	}

	public getInputValues(): Record<string, GraphInputValue> {
		return copyGraphInputValues(this.inputValues)
	}

	public setInputValue(inputId: string, value: GraphInputValue): void {
		this.inputValues[inputId] = copyGraphInputValue(value)
	}

	public removeInputValue(inputId: string): void {
		delete this.inputValues[inputId]
	}
}

function copyGraphInputValues(
	values: Record<string, GraphInputValue>
): Record<string, GraphInputValue> {
	return Object.fromEntries(Object.entries(values).map(([inputId, value]) => [
		inputId,
		copyGraphInputValue(value),
	]))
}

function copyGraphInputValue(value: GraphInputValue): GraphInputValue {
	if (Array.isArray(value)) return [...value]
	return Vector3Value.isSnapshot(value) ? { ...value } : value
}

export class GroupGraphNode extends GraphNode {
	public readonly type = 'group'
	public constructor(id: string, position: GraphPoint) { super(id, position) }
}

export class RepeatInputGraphNode extends GraphNode {
	public readonly type = 'repeatInput'
	private readonly instancesField: NumberField

	public constructor(id: string, position: GraphPoint, instances: number) {
		super(id, position)
		this.instancesField = new NumberField(
			instances,
			(value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
		)
	}

	public getInstances(): number { return this.instancesField.get() }
	public setInstances(instances: number): void { this.instancesField.set(instances) }
}

export class RepeatOutputGraphNode extends GraphNode {
	public readonly type = 'repeatOutput'

	public constructor(
		id: string,
		position: GraphPoint,
		private readonly repeatInputId: string
	) {
		super(id, position)
	}

	public getRepeatInputId(): string { return this.repeatInputId }
}

export class NumberAggregatorGraphNode extends GraphNode {
	public readonly type = 'numberAggregator'
	private readonly initialValueField: NumberField
	private readonly addValueField: NumberField

	public constructor(
		id: string,
		position: GraphPoint,
		initialValue: number,
		addValue: number
	) {
		super(id, position)
		this.initialValueField = new NumberField(initialValue)
		this.addValueField = new NumberField(addValue)
	}

	public getInitialValue(): number { return this.initialValueField.get() }
	public setInitialValue(value: number): void { this.initialValueField.set(value) }
	public getAddValue(): number { return this.addValueField.get() }
	public setAddValue(value: number): void { this.addValueField.set(value) }
}

export class GetNthElementGraphNode extends GraphNode {
	public readonly type = 'getNthElement'
	private readonly indexField: NumberField
	private readonly elementTypeField: EnumField<PrimitiveArrayElementType>

	public constructor(
		id: string,
		position: GraphPoint,
		index: number,
		elementType: PrimitiveArrayElementType
	) {
		super(id, position)
		this.indexField = new NumberField(
			index,
			(value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
		)
		this.elementTypeField = new EnumField(elementType, ['number', 'boolean', 'enum'])
	}

	public getIndex(): number { return this.indexField.get() }
	public setIndex(index: number): void { this.indexField.set(index) }
	public getElementType(): PrimitiveArrayElementType { return this.elementTypeField.get() }
	public setElementType(elementType: PrimitiveArrayElementType): void {
		this.elementTypeField.set(elementType)
	}
}

export class SumGraphNode extends GraphNode {
	public readonly type = 'sum'
	private readonly constantField: NumberField
	private readonly enabledField: BooleanField

	public constructor(
		id: string,
		position: GraphPoint,
		constant: number,
		enabled: boolean
	) {
		super(id, position)
		this.constantField = new NumberField(constant)
		this.enabledField = new BooleanField(enabled)
	}

	public getConstant(): number {
		return this.constantField.get()
	}

	public setConstant(constant: number): void {
		this.constantField.set(constant)
	}

	public getEnabled(): boolean {
		return this.enabledField.get()
	}

	public setEnabled(enabled: boolean): void {
		this.enabledField.set(enabled)
	}
}

export class MathExpressionGraphNode extends GraphNode {
	public readonly type = 'mathExpression'
	private expression!: string

	public constructor(id: string, position: GraphPoint, expression: string) {
		super(id, position)
		this.setExpression(expression)
	}

	public getExpression(): string {
		return this.expression
	}

	public setExpression(expression: string): void {
		validateMathExpression(expression)
		this.expression = expression
	}
}
