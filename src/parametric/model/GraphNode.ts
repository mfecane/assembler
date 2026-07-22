import { Vector3Value } from '@/parametric/model/Vector3Value'
import { DynamicInputPorts } from '@/parametric/model/DynamicInputPorts'
import { normalizePresetColor } from '@/parametric/model/ColorPalette'

export interface GraphPoint {
	x: number
	y: number
}

export type GraphNodeType = string
export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone'
export type Axis = 'x' | 'y' | 'z'
export type OriginAxis = 'min' | 'middle' | 'max'
export type GraphValueType = string

export interface GraphInputPort {
	id: string
	valueType: GraphValueType
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

export interface TransformOrigin {
	x: OriginAxis
	y: OriginAxis
	z: OriginAxis
}

export abstract class GraphNode {
	public abstract readonly type: GraphNodeType

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

}

export class PrimitiveGraphNode extends GraphNode {
	public readonly type = 'primitive'

	public constructor(
		id: string,
		position: GraphPoint,
		private primitive: PrimitiveKind,
		private size: Vector3Value
	) {
		super(id, position)
	}

	public getPrimitive(): PrimitiveKind {
		return this.primitive
	}

	public setPrimitive(primitive: PrimitiveKind): void {
		this.primitive = primitive
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

	public constructor(
		id: string,
		position: GraphPoint,
		private label: string,
		private value: number
	) {
		super(id, position)
	}

	public getLabel(): string {
		return this.label
	}

	public setLabel(label: string): void {
		this.label = label
	}

	public getValue(): number {
		return this.value
	}

	public setValue(value: number): void {
		this.value = Number.isFinite(value) ? value : 0
	}

}

export class SelectorGraphNode extends GraphNode {
	public readonly type = 'selector'
	private options: string[]
	private value: string

	public constructor(
		id: string,
		position: GraphPoint,
		private label: string,
		options: string[],
		value: string
	) {
		super(id, position)
		this.options = this.normalizeOptions(options)
		this.value = this.options.includes(value) ? value : this.options[0]
	}

	public getLabel(): string {
		return this.label
	}

	public setLabel(label: string): void {
		this.label = label
	}

	public getOptions(): string[] {
		return [...this.options]
	}

	public setOptions(options: string[]): void {
		this.options = this.normalizeOptions(options)
		if (!this.options.includes(this.value)) this.value = this.options[0]
	}

	public getValue(): string {
		return this.value
	}

	public setValue(value: string): void {
		if (this.options.includes(value)) this.value = value
	}

	private normalizeOptions(options: string[]): string[] {
		const normalized = [...new Set(options.map((option) => option.trim()).filter(Boolean))]
		return normalized.length > 0 ? normalized : ['Option']
	}
}

export class ColorGraphNode extends GraphNode {
	public readonly type = 'color'

	public constructor(
		id: string,
		position: GraphPoint,
		private label: string,
		private color: string
	) {
		super(id, position)
		this.color = normalizePresetColor(color)
	}

	public getLabel(): string {
		return this.label
	}

	public setLabel(label: string): void {
		this.label = label
	}

	public getColor(): string {
		return this.color
	}

	public setColor(color: string): void {
		this.color = normalizePresetColor(color)
	}
}

export class MeshSelectorGraphNode extends GraphNode {
	public readonly type = 'meshSelector'

	public constructor(
		id: string,
		position: GraphPoint,
		private selections: MeshSelection[]
	) {
		super(id, position)
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

}

export class MeshAssetGraphNode extends GraphNode {
	public readonly type = 'meshAsset'

	public constructor(
		id: string,
		position: GraphPoint,
		private meshId: string
	) {
		super(id, position)
	}

	public getMeshId(): string {
		return this.meshId
	}

	public setMeshId(meshId: string): void {
		this.meshId = meshId
	}
}

export class TransformGraphNode extends GraphNode {
	public readonly type = 'transform'

	public constructor(
		id: string,
		position: GraphPoint,
		private translation: Vector3Value,
		private rotation: Vector3Value,
		private scale: Vector3Value,
		private origin: TransformOrigin,
		private copy: boolean,
		private uniformScale: boolean
	) {
		super(id, position)
	}

	public getTranslation(): Vector3Value {
		return this.translation
	}

	public setTranslation(translation: Vector3Value): void {
		this.translation = translation
	}

	public getRotation(): Vector3Value {
		return this.rotation
	}

	public setRotation(rotation: Vector3Value): void {
		this.rotation = rotation
	}

	public getScale(): Vector3Value {
		return this.scale
	}

	public setScale(scale: Vector3Value): void {
		this.scale = scale
	}

	public getOrigin(): TransformOrigin {
		return { ...this.origin }
	}

	public setOrigin(origin: TransformOrigin): void {
		this.origin = { ...origin }
	}

	public getCopy(): boolean {
		return this.copy
	}

	public setCopy(copy: boolean): void {
		this.copy = copy
	}

	public getUniformScale(): boolean {
		return this.uniformScale
	}

	public setUniformScale(uniformScale: boolean): void {
		this.uniformScale = uniformScale
		if (uniformScale) {
			this.scale = new Vector3Value(this.scale.x, this.scale.x, this.scale.x)
		}
	}

}

export class MaterialGraphNode extends GraphNode {
	public readonly type = 'material'

	public constructor(
		id: string,
		position: GraphPoint,
		private color: string
	) {
		super(id, position)
		this.color = normalizePresetColor(color)
	}

	public getColor(): string {
		return this.color
	}

	public setColor(color: string): void {
		this.color = normalizePresetColor(color)
	}
}

export class ArrayGraphNode extends GraphNode {
	public readonly type = 'array'

	public constructor(
		id: string,
		position: GraphPoint,
		private count: number,
		private axis: Axis,
		private offset: number
	) {
		super(id, position)
	}

	public getCount(): number {
		return this.count
	}

	public setCount(count: number): void {
		this.count = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1
	}

	public getAxis(): Axis {
		return this.axis
	}

	public setAxis(axis: Axis): void {
		this.axis = axis
	}

	public getOffset(): number {
		return this.offset
	}

	public setOffset(offset: number): void {
		this.offset = offset
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

	public constructor(
		id: string,
		position: GraphPoint,
		private readonly graphId: string
	) {
		super(id, position)
	}

	public getGraphId(): string {
		return this.graphId
	}
}

export class GroupGraphNode extends GraphNode {
	public readonly type = 'group'
	private readonly inputPorts: DynamicInputPorts

	public constructor(id: string, position: GraphPoint, inputPorts: string[] = ['input-1']) {
		super(id, position)
		this.inputPorts = new DynamicInputPorts(inputPorts)
	}

	public getInputPortIds(): string[] {
		return this.inputPorts.getIds()
	}

	public syncInputPorts(connectedPortIds: ReadonlySet<string>): void {
		this.inputPorts.sync(connectedPortIds)
	}
}

export class SumGraphNode extends GraphNode {
	public readonly type = 'sum'
	private readonly inputPorts: DynamicInputPorts

	public constructor(
		id: string,
		position: GraphPoint,
		private constant: number,
		inputPorts: string[] = ['input-1']
	) {
		super(id, position)
		this.inputPorts = new DynamicInputPorts(inputPorts)
	}

	public getConstant(): number {
		return this.constant
	}

	public setConstant(constant: number): void {
		this.constant = Number.isFinite(constant) ? constant : 0
	}

	public getInputPortIds(): string[] {
		return this.inputPorts.getIds()
	}

	public syncInputPorts(connectedPortIds: ReadonlySet<string>): void {
		this.inputPorts.sync(connectedPortIds)
	}
}
