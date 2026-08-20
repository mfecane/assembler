import type { GraphInputValue } from '@/parametric/model/GraphDocumentModel'
import { copyLayoutInstanceMetadata, type LayoutInstanceMetadata } from '@/layout/GraphLayoutMetadata'

export type LayoutAxis = 'x'
export type LayoutType = 'row' | 'single'

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
	layoutMetadata?: LayoutInstanceMetadata
}

interface LayoutDocumentBase {
	id: string
	label: string
	configurationHeader: string
	slotId: string
	slotsCount: LayoutRangeDocument
}

export type LayoutDocument =
	| (LayoutDocumentBase & { type: 'row'; axis: LayoutAxis })
	| (LayoutDocumentBase & { type: 'single' })

export interface ProductDocument {
	id: string
	label: string
	layoutId: string
	instances: LayoutGraphInstanceDocument[]
}

export interface LayoutDataDocument {
	activeProductId: string
	layouts: LayoutDocument[]
	products: ProductDocument[]
	slots: LayoutSlotDocument[]
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
					`Layout slot definition "${slot.id}" requires a non-empty label and unique graph IDs. `
					+ `Received ${JSON.stringify(slot)}.`
				)
			}
			this.slots.set(slot.id, copySlot(slot))
		}
		for (const layout of document.layouts) {
			if (!layout.id.trim() || this.layouts.has(layout.id)) {
				throw new Error(`Layout data has a duplicate or empty layout ID "${layout.id}".`)
			}
			if (!layout.label.trim() || !layout.configurationHeader.trim() || !this.slots.has(layout.slotId)) {
				throw new Error(
					`Layout "${layout.id}" requires non-empty label and configurationHeader values, `
					+ 'plus an existing slot definition. '
					+ `Received slot definition ID "${layout.slotId}".`
				)
			}
			assertRange(layout.slotsCount, `slot count for layout "${layout.id}"`, true)
			if (layout.type === 'row' && layout.axis !== 'x') {
				throw new Error(`Row layout "${layout.id}" supports only the x axis. Received "${layout.axis}".`)
			}
			if (layout.type === 'single' && layout.slotsCount.max !== 1) {
				throw new Error(`Single layout "${layout.id}" must have a maximum slot count of 1.`)
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
			const layout = this.requireLayout(product.layoutId)
			if (product.instances.length > layout.slotsCount.max) {
				throw new Error(
					`Product "${product.id}" contains ${product.instances.length} items, exceeding layout `
					+ `"${layout.id}" maximum of ${layout.slotsCount.max}.`
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
				`Active product "${this.activeProductId}" does not exist. Available products: `
				+ `${JSON.stringify([...this.products.keys()])}.`
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
		this.requireSlot(layout.slotId)
		if (product.instances.length > layout.slotsCount.max) {
			throw new Error(
				`Cannot assign layout "${layoutId}" to product "${productId}": it contains `
				+ `${product.instances.length} items, exceeding the layout maximum of ${layout.slotsCount.max}.`
			)
		}
		product.layoutId = layoutId
	}

	public setConfigurationHeader(layoutId: string, header: string): void {
		const normalized = header.trim()
		if (!normalized) throw new Error(`Cannot set an empty configuration header on layout "${layoutId}".`)
		this.getMutableLayout(layoutId).configurationHeader = normalized
	}

	public setLayoutSlot(layoutId: string, slotId: string): void {
		const layout = this.getMutableLayout(layoutId)
		this.requireSlot(slotId)
		layout.slotId = slotId
	}

	public addInstance(productId: string, instance: LayoutGraphInstanceDocument): void {
		const product = this.getMutableProduct(productId)
		const layout = this.requireLayout(product.layoutId)
		if (product.instances.length >= layout.slotsCount.max) {
			throw new Error(`Product "${productId}" has reached its maximum of ${layout.slotsCount.max} items.`)
		}
		if ([...this.products.values()].some((item) => item.instances.some((candidate) => candidate.id === instance.id))) {
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

	public setInstanceGraph(
		productId: string,
		instanceId: string,
		graphId: string,
		inputValues: Record<string, GraphInputValue>
	): void {
		const item = this.getMutableInstance(productId, instanceId)
		item.graphId = graphId
		item.inputValues = copyInputValues(inputValues)
	}

	public setInstanceInputValue(
		productId: string,
		instanceId: string,
		inputId: string,
		value: GraphInputValue
	): void {
		this.getMutableInstance(productId, instanceId).inputValues[inputId] = copyInputValue(value)
	}

	public setInstanceLayoutMetadata(
		productId: string,
		instanceId: string,
		metadata: LayoutInstanceMetadata | undefined
	): void {
		this.getMutableInstance(productId, instanceId).layoutMetadata = copyLayoutInstanceMetadata(metadata)
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
		if (layout.type === 'single' && slotsCount.max !== 1) {
			throw new Error(`Single layout "${layoutId}" must have a maximum slot count of 1.`)
		}
		for (const product of this.products.values()) {
			if (product.layoutId === layoutId && product.instances.length > slotsCount.max) {
				throw new Error(
					`Cannot reduce layout "${layoutId}" to ${slotsCount.max} items while product `
					+ `"${product.id}" contains ${product.instances.length}.`
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
	if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min < 0 || range.max < range.min || (
		integer && (!Number.isInteger(range.min) || !Number.isInteger(range.max))
	)) {
		throw new Error(`Invalid ${context}: expected ${integer ? 'integer ' : ''}0 <= min <= max.`)
	}
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
	const base = {
		id: layout.id,
		label: layout.label,
		configurationHeader: layout.configurationHeader,
		type: layout.type,
		slotId: layout.slotId,
		slotsCount: { ...layout.slotsCount },
	}
	return layout.type === 'row' ? { ...base, type: 'row', axis: layout.axis } : { ...base, type: 'single' }
}

function copyProduct(product: ProductDocument): ProductDocument {
	return { ...product, instances: product.instances.map(copyInstance) }
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
		...(instance.layoutMetadata ? { layoutMetadata: copyLayoutInstanceMetadata(instance.layoutMetadata) } : {}),
	}
}

function copyInputValues(values: Record<string, GraphInputValue>): Record<string, GraphInputValue> {
	return Object.fromEntries(Object.entries(values).map(([id, value]) => [id, copyInputValue(value)]))
}

function copyInputValue(value: GraphInputValue): GraphInputValue {
	if (Array.isArray(value)) return [...value]
	return typeof value === 'object' ? { ...value } : value
}
