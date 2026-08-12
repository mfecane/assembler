import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { BooleanField } from '@/parametric/model/fields/BooleanField'
import { ColorField } from '@/parametric/model/fields/ColorField'
import { EnumField } from '@/parametric/model/fields/EnumField'
import { NumberField } from '@/parametric/model/fields/NumberField'
import { TransformField } from '@/parametric/model/fields/TransformField'
import type { GraphInputValue } from '@/parametric/model/GraphDocumentModel'

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
	| 'meshArray'
	| 'number'
	| 'numberArray'
	| 'vector3'
	| 'enum'
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

export class NumberInputGraphNode extends GraphNode {
	public readonly type = 'numberInput'
	private readonly valueField: NumberField

	public constructor(
		id: string,
		position: GraphPoint,
		value: number
	) {
		super(id, position)
		this.valueField = new NumberField(value)
	}

	public getValue(): number {
		return this.valueField.get()
	}

	public setValue(value: number): void {
		this.valueField.set(value)
	}

}

function normalizeChoiceOptions(options: readonly string[]): string[] {
	return EnumField.normalizeOptions(options)
}

function isChoiceIndex(value: number, options: readonly string[]): boolean {
	return Number.isInteger(value) && value >= 0 && value < options.length
}

export class SelectorGraphNode extends GraphNode {
	public readonly type = 'selector'
	private options: string[]
	private value: number

	public constructor(
		id: string,
		position: GraphPoint,
		options: string[],
		value: number
	) {
		super(id, position)
		this.options = normalizeChoiceOptions(options)
		this.value = isChoiceIndex(value, this.options) ? value : 0
	}

	public getOptions(): string[] {
		return [...this.options]
	}

	public setOptions(options: string[]): void {
		this.options = normalizeChoiceOptions(options)
		if (!isChoiceIndex(this.value, this.options)) this.value = 0
	}

	public getValue(): number {
		return this.value
	}

	public setValue(value: number): void {
		if (isChoiceIndex(value, this.options)) this.value = value
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

export class ColorGraphNode extends GraphNode {
	public readonly type = 'color'
	private readonly colorField: ColorField

	public constructor(
		id: string,
		position: GraphPoint,
		color: string
	) {
		super(id, position)
		this.colorField = new ColorField(color)
	}

	public getColor(): string {
		return this.colorField.get()
	}

	public setColor(color: string): void {
		this.colorField.set(color)
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

export class MaterialGraphNode extends GraphNode {
	public readonly type = 'material'
	private readonly colorField: ColorField

	public constructor(
		id: string,
		position: GraphPoint,
		color: string
	) {
		super(id, position)
		this.colorField = new ColorField(color)
	}

	public getColor(): string {
		return this.colorField.get()
	}

	public setColor(color: string): void {
		this.colorField.set(color)
	}
}

export class ArrayGraphNode extends GraphNode {
	public readonly type = 'array'
	private readonly countField: NumberField
	private readonly axisField: EnumField<Axis>
	private readonly offsetField: NumberField

	public constructor(
		id: string,
		position: GraphPoint,
		count: number,
		axis: Axis,
		offset: number
	) {
		super(id, position)
		this.countField = new NumberField(count, (value) =>
			Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 1)
		this.axisField = new EnumField(axis, ['x', 'y', 'z'])
		this.offsetField = new NumberField(offset)
	}

	public getCount(): number {
		return this.countField.get()
	}

	public setCount(count: number): void {
		this.countField.set(count)
	}

	public getAxis(): Axis {
		return this.axisField.get()
	}

	public setAxis(axis: Axis): void {
		this.axisField.set(axis)
	}

	public getOffset(): number {
		return this.offsetField.get()
	}

	public setOffset(offset: number): void {
		this.offsetField.set(offset)
	}

}

export class MeshArrayGraphNode extends GraphNode {
	public readonly type = 'meshArray'

	public constructor(id: string, position: GraphPoint) {
		super(id, position)
	}
}

export class MultiArrayGraphNode extends GraphNode {
	public readonly type = 'multiArray'
	private readonly axisField: EnumField<Axis>
	private readonly offsetField: NumberField

	public constructor(
		id: string,
		position: GraphPoint,
		axis: Axis,
		offset: number
	) {
		super(id, position)
		this.axisField = new EnumField(axis, ['x', 'y', 'z'])
		this.offsetField = new NumberField(offset)
	}

	public getAxis(): Axis { return this.axisField.get() }
	public setAxis(axis: Axis): void { this.axisField.set(axis) }
	public getOffset(): number { return this.offsetField.get() }
	public setOffset(offset: number): void { this.offsetField.set(offset) }
}

export class OutputGraphNode extends GraphNode {
	public readonly type = 'graphOutput'

	public constructor(id: string, position: GraphPoint) {
		super(id, position)
	}

}

export class GraphInputGraphNode extends GraphNode {
	public readonly type = 'graphInput'

	public constructor(
		id: string,
		position: GraphPoint,
		private readonly inputId: string
	) {
		super(id, position)
	}

	public getInputId(): string {
		return this.inputId
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
		return Array.isArray(value) ? [...value] : value
	}

	public getInputValues(): Record<string, GraphInputValue> {
		return copyGraphInputValues(this.inputValues)
	}

	public setInputValue(inputId: string, value: GraphInputValue): void {
		this.inputValues[inputId] = Array.isArray(value) ? [...value] : value
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
		Array.isArray(value) ? [...value] : value,
	]))
}

export class GroupGraphNode extends GraphNode {
	public readonly type = 'group'
	public constructor(id: string, position: GraphPoint) { super(id, position) }
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
