import { Vector3Value } from '@/parametric/model/Vector3Value'
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
export type GraphValueType = 'geometry' | 'number' | 'enum' | 'color' | 'boolean'

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

export interface MeshSelection {
	enumValue: string
	meshId: string
}

export interface EnumNumberMapping {
	enumValue: string
	value: number
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

export class SelectorGraphNode extends GraphNode {
	public readonly type = 'selector'
	private readonly valueField: EnumField

	public constructor(
		id: string,
		position: GraphPoint,
		options: string[],
		value: string
	) {
		super(id, position)
		this.valueField = new EnumField(value, options)
	}

	public getOptions(): string[] {
		return this.valueField.getOptions()
	}

	public setOptions(options: string[]): void {
		this.valueField.setOptions(options)
	}

	public getValue(): string {
		return this.valueField.get()
	}

	public setValue(value: string): void {
		this.valueField.set(value)
	}
}

export class EnumNumberMapGraphNode extends GraphNode {
	public readonly type = 'enumNumberMap'

	public constructor(
		id: string,
		position: GraphPoint,
		private mappings: EnumNumberMapping[]
	) {
		super(id, position)
	}

	public getMappings(): EnumNumberMapping[] {
		return this.mappings.map((mapping) => ({ ...mapping }))
	}

	public setMappings(mappings: EnumNumberMapping[]): void {
		this.mappings = mappings.map((mapping) => ({ ...mapping }))
	}

	public getNumber(enumValue: string): number | undefined {
		return this.mappings.find((mapping) => mapping.enumValue === enumValue)?.value
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

export class MeshSelectorGraphNode extends GraphNode {
	public readonly type = 'meshSelector'
	private readonly transform: TransformField

	public constructor(
		id: string,
		position: GraphPoint,
		private selections: MeshSelection[],
		transform = new TransformField()
	) {
		super(id, position)
		this.transform = transform
	}

	public getSelections(): MeshSelection[] {
		return this.selections.map((selection) => ({ ...selection }))
	}

	public setSelections(selections: MeshSelection[]): void {
		this.selections = selections.map((selection) => ({ ...selection }))
	}

	public getMeshId(enumValue: string): string | undefined {
		return this.selections.find((selection) => selection.enumValue === enumValue)?.meshId
	}

	public getTransform(): TransformField { return this.transform }

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
		this.inputValues = { ...inputValues }
	}

	public getGraphId(): string {
		return this.graphId
	}

	public getTransform(): TransformField { return this.transform }

	public getInputValue(inputId: string): GraphInputValue | undefined {
		return this.inputValues[inputId]
	}

	public getInputValues(): Record<string, GraphInputValue> {
		return { ...this.inputValues }
	}

	public setInputValue(inputId: string, value: GraphInputValue): void {
		this.inputValues[inputId] = value
	}

	public removeInputValue(inputId: string): void {
		delete this.inputValues[inputId]
	}
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
