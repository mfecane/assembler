import type { GraphInputValue } from '@/parametric/model/GraphDocumentModel'
import { productLayoutRegistry } from '@/layout/ProductLayoutRegistry'

export const DEFAULT_PRODUCT_ANIMATION_LABEL = 'Animate'

export interface LayoutRangeDocument {
	min: number
	max: number
}

export interface LayoutInstanceBoundsDocument {
	width: LayoutRangeDocument
	depth: LayoutRangeDocument
	height: LayoutRangeDocument
}

export interface LayoutSlotDocument {
	id: string
	label: string
	graphs: string[]
	instanceBounds: LayoutInstanceBoundsDocument
}

export interface LayoutGraphInstanceDocument {
	id: string
	graphId: string
	inputValues: Record<string, GraphInputValue>
}

export interface ProductConfigurationTarget {
	instanceId: string
	inputId: string
}

export type ProductConfigurationControl =
	| {
		id: string
		type: 'number' | 'slider' | 'select' | 'material' | 'switch' | 'color' | 'vector3'
		label: string
		target: ProductConfigurationTarget
		min?: number
		max?: number
		step?: number
	}
	| {
		id: string
		type: 'sectionList'
		label: string
		countTarget: ProductConfigurationTarget
		fields: Array<{
			id: string
			label: string
			target: ProductConfigurationTarget
			widget: 'number' | 'slider' | 'select'
			min?: number
			max?: number
			step?: number
		}>
	}

export interface ProductConfigurationDocument {
	header: string
	controls: ProductConfigurationControl[]
}

export interface LayoutDocument {
	id: string
	label: string
	slotId: string
	slotsCount: LayoutRangeDocument
}

export interface ProductDocument {
	id: string
	label: string
	animationLabel?: string
	configuration?: ProductConfigurationDocument
	layoutId: string
	instances: LayoutGraphInstanceDocument[]
}

export interface LayoutDataDocument {
	activeProductId: string
	layouts: LayoutDocument[]
	products: ProductDocument[]
	slots: LayoutSlotDocument[]
}

export interface ProductDataDocument {
	activeProductId: string
	products: ProductDocument[]
}

const DEFAULT_SLOT_ID = 'root-graphs'

export function createDefaultLayoutData(
	productData: ProductDataDocument,
	rootGraphIds: readonly string[]
): LayoutDataDocument {
	return {
		activeProductId: productData.activeProductId,
		layouts: productLayoutRegistry.getAll().map((layout) => ({
			id: layout.id,
			label: layout.label,
			slotId: DEFAULT_SLOT_ID,
			slotsCount: { min: 1, max: layout.maximumInstances },
		})),
		products: productData.products.map(copyProduct),
		slots: [{
			id: DEFAULT_SLOT_ID,
			label: 'Root graph',
			graphs: [...rootGraphIds],
			instanceBounds: {
				width: { min: 0.001, max: 100 },
				depth: { min: 0.001, max: 100 },
				height: { min: 0.001, max: 100 },
			},
		}],
	}
}

export class LayoutModel {
	private activeProductId: string
	private readonly layouts = new Map<string, LayoutDocument>()
	private readonly products = new Map<string, ProductDocument>()
	private readonly slots = new Map<string, LayoutSlotDocument>()

	public constructor(document: LayoutDataDocument) {
		this.activeProductId = document.activeProductId
		for (const slot of document.slots) {
			if (!slot.id.trim() || this.slots.has(slot.id)) {
				throw new Error(`Layout data has a duplicate or empty slot definition ID "${slot.id}".`)
			}
			assertInstanceBounds(slot.id, slot.instanceBounds)
			if (!slot.label.trim() || new Set(slot.graphs).size !== slot.graphs.length) {
				throw new Error(
					`Layout slot definition "${slot.id}" requires a non-empty label and unique graph IDs. ` +
						`Received ${JSON.stringify(slot)}.`
				)
			}
			this.slots.set(slot.id, copySlot(slot))
		}
		for (const layout of document.layouts) {
			if (!layout.id.trim() || this.layouts.has(layout.id)) {
				throw new Error(`Layout data has a duplicate or empty layout ID "${layout.id}".`)
			}
			if (!layout.label.trim() || !this.slots.has(layout.slotId)) {
				throw new Error(
				`Layout "${layout.id}" requires a non-empty label and an existing slot definition. ` +
						`Received slot definition ID "${layout.slotId}".`
				)
			}
			assertRange(layout.slotsCount, `slot count for layout "${layout.id}"`, true)
			const implementation = productLayoutRegistry.require(layout.id)
			if (layout.slotsCount.max !== implementation.maximumInstances) {
				throw new Error(
					`Layout "${layout.id}" instance limit must come from its code implementation. `
					+ `Expected ${implementation.maximumInstances}, received ${layout.slotsCount.max}.`
				)
			}
			this.layouts.set(layout.id, copyLayout(layout))
		}

		const instanceIds = new Set<string>()
		for (const product of document.products) {
			if (!product.id.trim() || this.products.has(product.id)) {
				throw new Error(`Layout data has a duplicate or empty product ID "${product.id}".`)
			}
			if (!product.label.trim() || !this.layouts.has(product.layoutId)) {
				throw new Error(
					`Product "${product.id}" requires a non-empty label and existing layout "${product.layoutId}".`
				)
			}
			assertProductConfiguration(product.id, product.configuration)
			const layout = this.requireLayout(product.layoutId)
			if (product.instances.length > layout.slotsCount.max) {
				throw new Error(
					`Product "${product.id}" contains ${product.instances.length} items, exceeding layout ` +
						`"${layout.id}" maximum of ${layout.slotsCount.max}.`
				)
			}
			for (const instance of product.instances) {
				if (!instance.id.trim() || instanceIds.has(instance.id)) {
					throw new Error(`Product "${product.id}" has a duplicate or empty item ID "${instance.id}".`)
				}
				instanceIds.add(instance.id)
			}
			this.products.set(product.id, copyProduct(product))
		}
		if (!this.products.has(this.activeProductId)) {
			throw new Error(
				`Active product "${this.activeProductId}" does not exist. Available products: ` +
					`${JSON.stringify([...this.products.keys()])}.`
			)
		}
	}

	public toDocument(): LayoutDataDocument {
		return {
			activeProductId: this.activeProductId,
			layouts: [...this.layouts.values()].map(copyLayout),
			products: [...this.products.values()].map(copyProduct),
			slots: [...this.slots.values()].map(copySlot),
		}
	}

	public requireLayout(layoutId: string): LayoutDocument {
		const layout = this.layouts.get(layoutId)
		if (!layout) throw new Error(`Unknown layout "${layoutId}".`)
		return copyLayout(layout)
	}

	public requireProduct(productId: string): ProductDocument {
		const product = this.products.get(productId)
		if (!product) throw new Error(`Unknown product "${productId}".`)
		return copyProduct(product)
	}

	public getActiveProduct(): ProductDocument {
		return this.requireProduct(this.activeProductId)
	}

	public requireSlot(slotId: string): LayoutSlotDocument {
		const slot = this.slots.get(slotId)
		if (!slot) throw new Error(`Unknown layout slot definition "${slotId}".`)
		return copySlot(slot)
	}

	public setActiveProduct(productId: string): void {
		this.requireProduct(productId)
		this.activeProductId = productId
	}

	public addProduct(product: ProductDocument): void {
		if (!product.id.trim() || this.products.has(product.id)) {
			throw new Error(`Cannot add duplicate or empty product ID "${product.id}".`)
		}
		if (!product.label.trim()) throw new Error(`Cannot add product "${product.id}" with an empty label.`)
		this.requireLayout(product.layoutId)
		if (product.instances.length > 0) {
			throw new Error(`New product "${product.id}" must start empty.`)
		}
		this.products.set(product.id, copyProduct(product))
	}

	public setProductLabel(productId: string, label: string): void {
		const normalized = label.trim()
		if (!normalized) throw new Error(`Cannot set an empty label on product "${productId}".`)
		this.getMutableProduct(productId).label = normalized
	}

	public setProductAnimationLabel(productId: string, label: string): void {
		const normalized = label.trim()
		if (!normalized) {
			throw new Error(`Cannot set an empty animation label on product "${productId}".`)
		}
		this.getMutableProduct(productId).animationLabel = normalized
	}

	public removeProduct(productId: string): void {
		if (this.products.size <= 1) {
			throw new Error(`Cannot delete product "${productId}": a project requires at least one product.`)
		}
		if (!this.products.delete(productId)) throw new Error(`Cannot delete unknown product "${productId}".`)
		if (this.activeProductId === productId) {
			const nextProductId = this.products.keys().next().value
			if (!nextProductId) throw new Error('Cannot select a replacement active product.')
			this.activeProductId = nextProductId
		}
	}

	public setProductLayout(productId: string, layoutId: string): void {
		const product = this.getMutableProduct(productId)
		const layout = this.requireLayout(layoutId)
		const slot = this.requireSlot(layout.slotId)
		if (product.instances.length > layout.slotsCount.max) {
			throw new Error(
				`Cannot assign layout "${layoutId}" to product "${productId}": it contains ` +
					`${product.instances.length} items, exceeding the layout maximum of ${layout.slotsCount.max}.`
			)
		}
		this.assertSlotSupportsInstances(slot, product.instances, `product "${productId}"`)
		product.layoutId = layoutId
	}


	public setProductConfiguration(productId: string, configuration: ProductConfigurationDocument): void {
		assertProductConfiguration(productId, configuration)
		this.getMutableProduct(productId).configuration = copyProductConfiguration(configuration)
	}

	public setLayoutSlot(layoutId: string, slotId: string): void {
		const layout = this.getMutableLayout(layoutId)
		const slot = this.requireSlot(slotId)
		for (const product of this.products.values()) {
			if (product.layoutId !== layoutId) continue
			this.assertSlotSupportsInstances(slot, product.instances, `product "${product.id}"`)
		}
		layout.slotId = slotId
	}

	public addInstance(productId: string, instance: LayoutGraphInstanceDocument): void {
		const product = this.getMutableProduct(productId)
		const layout = this.requireLayout(product.layoutId)
		if (product.instances.length >= layout.slotsCount.max) {
			throw new Error(`Product "${productId}" has reached its maximum of ${layout.slotsCount.max} items.`)
		}
		if (
			[...this.products.values()].some((item) => item.instances.some((candidate) => candidate.id === instance.id))
		) {
			throw new Error(`Cannot add duplicate product item ID "${instance.id}".`)
		}
		product.instances.push(copyInstance(instance))
	}

	public removeInstance(productId: string, instanceId: string): void {
		const product = this.getMutableProduct(productId)
		const index = product.instances.findIndex((item) => item.id === instanceId)
		if (index < 0) throw new Error(`Product "${productId}" does not contain item "${instanceId}".`)
		product.instances.splice(index, 1)
	}

	public setInstanceInputValue(productId: string, instanceId: string, inputId: string, value: GraphInputValue): void {
		this.getMutableInstance(productId, instanceId).inputValues[inputId] = copyInputValue(value)
	}

	public addSlot(slot: LayoutSlotDocument): void {
		if (!slot.id.trim() || this.slots.has(slot.id)) {
			throw new Error(`Cannot add duplicate or empty slot ID "${slot.id}".`)
		}
		assertInstanceBounds(slot.id, slot.instanceBounds)
		if (!slot.label.trim() || slot.graphs.length > 0) {
			throw new Error(`New slot "${slot.id}" must have a label and start without products.`)
		}
		this.slots.set(slot.id, copySlot(slot))
	}

	public setSlotGraphs(slotId: string, graphIds: string[]): void {
		const slot = this.getMutableSlot(slotId)
		for (const layout of this.layouts.values()) {
			if (layout.slotId !== slotId) continue
			for (const product of this.products.values()) {
				if (product.layoutId !== layout.id) continue
				this.assertSlotSupportsInstances(
					{ ...slot, graphs: graphIds },
					product.instances,
					`product "${product.id}" using layout "${layout.id}"`
				)
			}
		}
		slot.graphs = [...graphIds]
	}

	public setSlotLabel(slotId: string, label: string): void {
		const normalized = label.trim()
		if (!normalized) throw new Error(`Cannot set an empty label on slot "${slotId}".`)
		this.getMutableSlot(slotId).label = normalized
	}

	public removeSlot(slotId: string): void {
		if (!this.slots.delete(slotId)) throw new Error(`Cannot remove unknown slot "${slotId}".`)
	}

	public setLayoutSlotsCount(layoutId: string, slotsCount: LayoutRangeDocument): void {
		const layout = this.getMutableLayout(layoutId)
		assertRange(slotsCount, `slot count for layout "${layoutId}"`, true)
		const implementation = productLayoutRegistry.require(layoutId)
		if (slotsCount.max !== implementation.maximumInstances) {
			throw new Error(
				`Cannot override the code-defined maximum of ${implementation.maximumInstances} `
				+ `instances for layout "${layoutId}".`
			)
		}
		for (const product of this.products.values()) {
			if (product.layoutId === layoutId && product.instances.length > slotsCount.max) {
				throw new Error(
					`Cannot reduce layout "${layoutId}" to ${slotsCount.max} items while product ` +
						`"${product.id}" contains ${product.instances.length}.`
				)
			}
		}
		layout.slotsCount = { ...slotsCount }
	}

	public setSlotInstanceBounds(slotId: string, instanceBounds: LayoutInstanceBoundsDocument): void {
		assertInstanceBounds(slotId, instanceBounds)
		this.getMutableSlot(slotId).instanceBounds = {
			width: { ...instanceBounds.width },
			depth: { ...instanceBounds.depth },
			height: { ...instanceBounds.height },
		}
	}

	public removeGraph(graphId: string): void {
		for (const slot of this.slots.values()) slot.graphs = slot.graphs.filter((item) => item !== graphId)
		for (const product of this.products.values()) {
			product.instances = product.instances.filter((item) => item.graphId !== graphId)
		}
	}

	private getMutableLayout(layoutId: string): LayoutDocument {
		const layout = this.layouts.get(layoutId)
		if (!layout) throw new Error(`Cannot mutate unknown layout "${layoutId}".`)
		return layout
	}

	private assertSlotSupportsInstances(
		slot: LayoutSlotDocument,
		instances: readonly LayoutGraphInstanceDocument[],
		context: string
	): void {
		const invalid = instances.filter((instance) => !slot.graphs.includes(instance.graphId))
		if (invalid.length === 0) return
		throw new Error(
			`Cannot use slot "${slot.id}" for ${context}: it does not allow existing graph instances `
			+ `${JSON.stringify(invalid.map((instance) => ({ id: instance.id, graphId: instance.graphId })))}. `
			+ `Allowed graph IDs: ${JSON.stringify(slot.graphs)}.`
		)
	}

	private getMutableProduct(productId: string): ProductDocument {
		const product = this.products.get(productId)
		if (!product) throw new Error(`Cannot mutate unknown product "${productId}".`)
		return product
	}

	private getMutableSlot(slotId: string): LayoutSlotDocument {
		const slot = this.slots.get(slotId)
		if (!slot) throw new Error(`Cannot mutate unknown slot "${slotId}".`)
		return slot
	}

	private getMutableInstance(productId: string, instanceId: string): LayoutGraphInstanceDocument {
		const instance = this.getMutableProduct(productId).instances.find((item) => item.id === instanceId)
		if (!instance) throw new Error(`Product "${productId}" does not contain item "${instanceId}".`)
		return instance
	}
}

function assertRange(range: LayoutRangeDocument, context: string, integer = false): void {
	if (
		!Number.isFinite(range.min) ||
		!Number.isFinite(range.max) ||
		range.min < 0 ||
		range.max < range.min ||
		(integer && (!Number.isInteger(range.min) || !Number.isInteger(range.max)))
	) {
		throw new Error(`Invalid ${context}: expected ${integer ? 'integer ' : ''}0 <= min <= max.`)
	}
}

function assertProductConfiguration(
	productId: string,
	configuration: ProductConfigurationDocument | undefined
): void {
	if (configuration === undefined) return
	if (!configuration.header.trim() || new Set(configuration.controls.map((control) => control.id)).size !== configuration.controls.length) {
		throw new Error(`Product "${productId}" has an invalid configuration header or duplicate control IDs.`)
	}
	for (const control of configuration.controls) {
		if (!control.id.trim() || !control.label.trim()) {
			throw new Error(`Product "${productId}" has a configuration control with an empty ID or label.`)
		}
		if (control.type === 'sectionList') {
			if (!isTarget(control.countTarget)) {
				throw new Error(`Section-list control "${control.id}" on product "${productId}" is incomplete.`)
			}
			if (new Set(control.fields.map((field) => field.id)).size !== control.fields.length) {
				throw new Error(`Section-list control "${control.id}" on product "${productId}" has duplicate field IDs.`)
			}
			for (const field of control.fields) {
				if (
					!field.id.trim()
					|| !field.label.trim()
					|| !isTarget(field.target)
					|| (field.widget !== undefined && !['number', 'slider', 'select'].includes(field.widget))
				) {
					throw new Error(`Section-list control "${control.id}" on product "${productId}" has an invalid field.`)
				}
			}
		} else if (control.target !== undefined && !isTarget(control.target)) {
			throw new Error(`Configuration control "${control.id}" on product "${productId}" has an invalid target.`)
		}
	}
}

function isTarget(target: ProductConfigurationTarget): boolean {
	return target.instanceId.trim().length > 0 && target.inputId.trim().length > 0
}

function assertInstanceBounds(slotId: string, bounds: LayoutInstanceBoundsDocument): void {
	assertRange(bounds.width, `width bounds for slot "${slotId}"`)
	assertRange(bounds.depth, `depth bounds for slot "${slotId}"`)
	assertRange(bounds.height, `height bounds for slot "${slotId}"`)
	if (bounds.width.max <= 0 || bounds.depth.max <= 0 || bounds.height.max <= 0) {
		throw new Error(`Slot "${slotId}" requires positive maximum dimensions.`)
	}
}

function copyLayout(layout: LayoutDocument): LayoutDocument {
	return {
		id: layout.id,
		label: layout.label,
		slotId: layout.slotId,
		slotsCount: { ...layout.slotsCount },
	}
}

function copyProduct(product: ProductDocument): ProductDocument {
	return {
		...product,
		animationLabel: normalizeProductAnimationLabel(product.animationLabel),
		configuration: product.configuration && copyProductConfiguration(product.configuration),
		instances: product.instances.map(copyInstance),
	}
}

function copyProductConfiguration(configuration: ProductConfigurationDocument): ProductConfigurationDocument {
	return {
		header: configuration.header,
		controls: configuration.controls.map((control) => control.type === 'sectionList'
			? {
				...control,
				...(control.countTarget ? { countTarget: { ...control.countTarget } } : {}),
				fields: control.fields.map((field) => ({
					...field,
					...(field.target ? { target: { ...field.target } } : {}),
				})),
			}
			: { ...control, ...(control.target ? { target: { ...control.target } } : {}) }
		),
	}
}

function normalizeProductAnimationLabel(value: unknown): string {
	return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_PRODUCT_ANIMATION_LABEL
}

function copySlot(slot: LayoutSlotDocument): LayoutSlotDocument {
	return {
		...slot,
		graphs: [...slot.graphs],
		instanceBounds: {
			width: { ...slot.instanceBounds.width },
			depth: { ...slot.instanceBounds.depth },
			height: { ...slot.instanceBounds.height },
		},
	}
}

function copyInstance(instance: LayoutGraphInstanceDocument): LayoutGraphInstanceDocument {
	return {
		...instance,
		inputValues: copyInputValues(instance.inputValues),
	}
}

function copyInputValues(values: Record<string, GraphInputValue>): Record<string, GraphInputValue> {
	return Object.fromEntries(Object.entries(values).map(([id, value]) => [id, copyInputValue(value)]))
}

function copyInputValue(value: GraphInputValue): GraphInputValue {
	if (Array.isArray(value)) return [...value]
	return typeof value === 'object' ? { ...value } : value
}
