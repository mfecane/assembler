import { InputGraphNode, type GraphValueType } from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import type { GraphModel, GraphModelReader } from '@/parametric/model/GraphModel'
import {
	EnumDefinition,
	type EnumDefinitionSnapshot,
} from '@/parametric/model/EnumDefinition'
import { RootGraph } from '@/parametric/model/RootGraph'
import type { Client } from '@/constants'
import {
	LayoutModel,
	type LayoutDataDocument,
	type ProductDataDocument,
	createDefaultLayoutData,
	type LayoutGraphInstanceDocument,
	type LayoutInstanceBoundsDocument,
	type LayoutRangeDocument,
	type LayoutSlotDocument,
	type ProductConfigurationControl,
	type ProductConfigurationDocument,
	type ProductDocument,
} from '@/layout/LayoutDocument'
import { productLayoutRegistry } from '@/layout/ProductLayoutRegistry'

export type GraphInputValue = number | number[] | Array<number | boolean> | Vector3Snapshot | string | boolean
export type GraphInputValueType = GraphValueType

export interface GraphInputDefinition {
	id: string
	label: string
	valueType: GraphInputValueType
	defaultValue?: GraphInputValue
	enumId?: string
}

export interface GraphOutputDefinition {
	id: string
	label: string
	valueType: 'geometry'
}

export interface GraphInterface {
	id: string
	label: string
	inputs: GraphInputDefinition[]
	output: GraphOutputDefinition
}

export interface GraphDefinition extends GraphInterface {
	model: GraphModel
}

export interface GraphDefinitionReader extends GraphInterface {
	readonly model: GraphModelReader
}

export interface RootGraphReader {
	getGraphId(): string
}

interface ConfigurationPanelControlBase {
	id: string
	inputId: string
	label: string
}

export type ConfigurationPanelControl =
	| (ConfigurationPanelControlBase & { type: 'number'; step: number })
	| (ConfigurationPanelControlBase & {
		type: 'slider'
		min: number
		max: number
		step: number
	})
	| (ConfigurationPanelControlBase & { type: 'select' })
	| (ConfigurationPanelControlBase & { type: 'material' })
	| (ConfigurationPanelControlBase & { type: 'switch' })
	| (ConfigurationPanelControlBase & { type: 'color' })
	| (ConfigurationPanelControlBase & { type: 'vector3'; step: number })
	| (ConfigurationPanelControlBase & { type: 'primitiveArray' })

export interface ConfigurationTemplate {
	id: string
	label: string
	values: Record<string, GraphInputValue>
}

export type ConfigurationField =
	| { id: string; type: 'number'; label: string; value: number; step: number; min?: number; max?: number }
	| {
		id: string
		type: 'slider'
		label: string
		value: number
		min: number
		max: number
		step: number
	}
	| { id: string; type: 'enum'; label: string; value: number; options: string[] }
	| { id: string; type: 'material'; label: string; value: string }
	| { id: string; type: 'color'; label: string; value: string }
	| { id: string; type: 'vector3'; label: string; value: Vector3Snapshot; step: number }
	| { id: string; type: 'boolean'; label: string; value: boolean }
	| {
		id: string
		type: 'primitiveArray'
		label: string
		value: Array<number | boolean>
		elementType: 'number' | 'boolean' | 'enum'
		options: string[]
	}

export interface GraphDocumentReader {
	getLayout(): LayoutDataDocument
	getRootGraphs(): RootGraphReader[]
	isRootGraph(graphId: string): boolean
	getEnumDefinitions(): EnumDefinitionSnapshot[]
	requireEnumDefinition(enumId: string): EnumDefinitionSnapshot
	getInputOptions(input: GraphInputDefinition): string[]
	getEnumUsageCount(enumId: string): number
	getGraphs(): GraphDefinitionReader[]
	getGraph(graphId: string): GraphDefinitionReader | undefined
	requireGraph(graphId: string): GraphDefinitionReader
	getRootInputValue(graphId: string, inputId: string): GraphInputValue | undefined
	getConfigurationControls(graphId: string): ConfigurationPanelControl[]
	getConfigurationTemplates(graphId: string): ConfigurationTemplate[]
}

export class GraphDocumentModel implements GraphDocumentReader {
	private readonly graphs = new Map<string, GraphDefinition>()
	private readonly enumDefinitions = new Map<string, EnumDefinition>()
	private readonly rootGraphs = new Map<string, RootGraph>()
	private layout: LayoutModel

	public constructor(
		private readonly client: Client,
		rootGraphs: RootGraph[],
		enumDefinitions: EnumDefinitionSnapshot[],
		graphs: GraphDefinition[],
		productData: ProductDataDocument
	) {
		for (const definition of enumDefinitions) {
			if (this.enumDefinitions.has(definition.id)) {
				throw new Error(`Duplicate choice-set ID "${definition.id}"`)
			}
			this.enumDefinitions.set(
				definition.id,
				new EnumDefinition(definition.id, definition.name, definition.options)
			)
		}
		for (const graph of graphs) {
			if (this.graphs.has(graph.id)) throw new Error(`Duplicate graph ID "${graph.id}"`)
			this.graphs.set(graph.id, graph)
		}
		if (rootGraphs.length === 0) throw new Error('Graph document requires at least one root graph')
		for (const root of rootGraphs) {
			const graphId = root.getGraphId()
			if (this.rootGraphs.has(graphId)) throw new Error(`Duplicate root graph "${graphId}"`)
			const graph = this.graphs.get(graphId)
			if (!graph) throw new Error(`Root references unknown graph "${graphId}"`)
			this.rootGraphs.set(graphId, root)
		}
		for (const root of this.rootGraphs.values()) {
			this.validateReferences(root)
			this.reconcileConfigurationTemplates(root)
		}
		this.layout = this.createLayoutModel(productData)
	}

	public getLayout(): LayoutDataDocument {
		return this.createLayoutModel(this.getProductData()).toDocument()
	}

	public getProductData(): ProductDataDocument {
		const layout = this.layout.toDocument()
		return {
			activeProductId: layout.activeProductId,
			products: layout.products,
		}
	}

	public setActiveProduct(productId: string): void {
		this.layout.setActiveProduct(productId)
	}

	public addProduct(product: ProductDocument): void {
		this.layout.addProduct(product)
	}

	public setProductLabel(productId: string, label: string): void {
		this.layout.setProductLabel(productId, label)
	}

	public setProductAnimationLabel(productId: string, label: string): void {
		this.layout.setProductAnimationLabel(productId, label)
	}

	public removeProduct(productId: string): void {
		this.layout.removeProduct(productId)
	}

	public setProductLayout(productId: string, layoutId: string): void {
		this.layout.setProductLayout(productId, layoutId)
	}


	public setProductConfiguration(productId: string, configuration: ProductConfigurationDocument): void {
		this.assertProductConfigurationBindings(productId, configuration)
		this.layout.setProductConfiguration(productId, configuration)
	}

	public setLayoutSlot(layoutId: string, slotId: string): void {
		this.layout.setLayoutSlot(layoutId, slotId)
	}

	public addDefaultProductInstance(productId: string, instanceId: string): void {
		const product = this.layout.requireProduct(productId)
		const layout = productLayoutRegistry.require(product.layoutId)
		const rootGraphIds = [...this.rootGraphs.keys()]
		const graphId = rootGraphIds.find((candidate) => layout.canInstantiateGraph(candidate, rootGraphIds))
		if (!graphId) {
			throw new Error(
				`Cannot add an item to product "${productId}" with layout "${layout.id}": `
				+ `none of the root graphs ${JSON.stringify(rootGraphIds)} satisfy its instantiation rules.`
			)
		}
		this.layout.addInstance(productId, {
			id: instanceId,
			graphId,
			inputValues: this.getInitialLayoutInputValues(graphId),
		})
	}

	public removeProductInstance(productId: string, instanceId: string): void {
		this.layout.removeInstance(productId, instanceId)
	}

	public setProductInstanceInputValue(
		productId: string,
		instanceId: string,
		inputId: string,
		value: GraphInputValue
	): void {
		const instance = this.requireProductInstance(productId, instanceId)
		const input = this.requireGraph(instance.graphId).inputs.find(
			(candidate) => candidate.id === inputId
		)
		if (!input || !this.isInputValueCompatible(input, value)) {
			throw new Error(
				`Cannot set product item input "${inputId}" on item "${instanceId}" in product `
				+ `"${productId}" to ${JSON.stringify(value)}: graph "${instance.graphId}" has no `
				+ 'compatible public input with that ID.'
			)
		}
		this.layout.setInstanceInputValue(productId, instanceId, inputId, value)
	}

	public setProductConfigurationControlValue(
		productId: string,
		controlId: string,
		value: GraphInputValue
	): void {
		const control = this.requireProductConfigurationControl(productId, controlId)
		if (control.type === 'sectionList') {
			throw new Error(`Configuration control "${controlId}" on product "${productId}" is a section list.`)
		}
		if (
			(control.type === 'number' || control.type === 'slider')
			&& typeof value === 'number'
			&& ((control.min !== undefined && value < control.min) || (control.max !== undefined && value > control.max))
		) {
			throw new Error(`Value ${value} is outside bounds for configuration control "${controlId}".`)
		}
		this.setProductInstanceInputValue(productId, control.target.instanceId, control.target.inputId, value)
	}

	public setProductConfigurationSectionValue(
		productId: string,
		controlId: string,
		fieldId: string,
		index: number,
		value: number
	): void {
		const control = this.requireSectionListControl(productId, controlId)
		const field = control.fields.find((candidate) => candidate.id === fieldId)
		if (!field || !Number.isInteger(index) || index < 0 || !Number.isFinite(value)) {
			throw new Error(`Cannot update section "${index}" field "${fieldId}" on product "${productId}".`)
		}
		const values = this.getSectionListValues(productId, control)
		if (index >= values.length) {
			throw new Error(`Section "${index}" does not exist in configuration control "${controlId}".`)
		}
		const input = this.requireInput(productId, field.target.instanceId, field.target.inputId)
		if (input.enumId) {
			const options = this.getInputOptions(input)
			if (!isEnumIndex(value, options)) {
				throw new Error(
					`Cannot set section ${index + 1} field "${field.label}" ("${field.id}") on product `
					+ `"${productId}" configuration control "${control.label}" ("${control.id}") to choice `
					+ `index ${value}: target input "${input.id}" uses choice set "${input.enumId}" with `
					+ `${options.length} options ${JSON.stringify(options)}. Expected an integer index from 0 to `
					+ `${options.length - 1}.`
				)
			}
		}
		if (
			(field.widget === 'number' || field.widget === 'slider')
			&& ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))
		) {
			throw new Error(`Value ${value} is outside bounds for section field "${field.id}".`)
		}
		values[index][fieldId] = value
		this.writeSectionListValues(productId, control, values)
	}

	public addProductConfigurationSection(productId: string, controlId: string): void {
		const control = this.requireSectionListControl(productId, controlId)
		const values = this.getSectionListValues(productId, control)
		values.push(Object.fromEntries(control.fields.map((field) => {
			const input = this.requireInput(productId, field.target.instanceId, field.target.inputId)
			return [field.id, this.getSectionFieldDefaultValue(productId, control, field, input)]
		})))
		this.writeSectionListValues(productId, control, values)
	}

	public removeProductConfigurationSection(productId: string, controlId: string, index: number): void {
		const control = this.requireSectionListControl(productId, controlId)
		const values = this.getSectionListValues(productId, control)
		if (!Number.isInteger(index) || index < 0 || index >= values.length) {
			throw new Error(`Cannot remove missing section "${index}" from configuration control "${controlId}".`)
		}
		values.splice(index, 1)
		this.writeSectionListValues(productId, control, values)
	}

	public setLayoutSlotGraphs(slotId: string, graphIds: string[]): void {
		if (new Set(graphIds).size !== graphIds.length) {
			throw new Error(
				`Cannot update slot definition "${slotId}" with duplicate graph IDs `
				+ `${JSON.stringify(graphIds)}.`
			)
		}
		for (const graphId of graphIds) this.requireRootGraph(graphId)
		this.layout.setSlotGraphs(slotId, graphIds)
	}

	public setLayoutSlotLabel(slotId: string, label: string): void {
		this.layout.setSlotLabel(slotId, label)
	}

	public removeLayoutSlot(slotId: string): void {
		const layouts = this.layout.toDocument().layouts
			.filter((layout) => layout.slotId === slotId)
			.map((layout) => layout.id)
		if (layouts.length > 0) {
			throw new Error(
				`Cannot remove slot definition "${slotId}" because layouts reference it: ${JSON.stringify(layouts)}.`
			)
		}
		this.layout.removeSlot(slotId)
	}

	public addLayoutSlot(slot: LayoutSlotDocument): void {
		this.layout.addSlot(slot)
	}

	public setLayoutSlotsCount(layoutId: string, slotsCount: LayoutRangeDocument): void {
		this.layout.setLayoutSlotsCount(layoutId, slotsCount)
	}

	public setLayoutSlotInstanceBounds(
		slotId: string,
		instanceBounds: LayoutInstanceBoundsDocument
	): void {
		this.layout.setSlotInstanceBounds(slotId, instanceBounds)
	}

	public getClient(): Client {
		return this.client
	}

	public getDefaultRootGraphId(): string {
		const graphId = this.rootGraphs.keys().next().value
		if (!graphId) throw new Error('Graph document has no root graphs')
		return graphId
	}

	public getRootGraphs(): RootGraph[] {
		return [...this.rootGraphs.values()]
	}

	public getRootGraph(graphId: string): RootGraph | undefined {
		return this.rootGraphs.get(graphId)
	}

	public requireRootGraph(graphId: string): RootGraph {
		const root = this.rootGraphs.get(graphId)
		if (!root) throw new Error(`Graph "${graphId}" is not a root graph`)
		return root
	}

	public isRootGraph(graphId: string): boolean {
		return this.rootGraphs.has(graphId)
	}

	public getEnumDefinitions(): EnumDefinitionSnapshot[] {
		return [...this.enumDefinitions.values()].map((definition) => definition.toSnapshot())
	}

	public getEnumDefinition(enumId: string): EnumDefinitionSnapshot | undefined {
		return this.enumDefinitions.get(enumId)?.toSnapshot()
	}

	public requireEnumDefinition(enumId: string): EnumDefinitionSnapshot {
		const definition = this.getEnumDefinition(enumId)
		if (!definition) throw new Error(`Unknown choice set "${enumId}"`)
		return definition
	}

	public getEnumOptions(enumId: string): string[] {
		return this.requireEnumEntity(enumId).getOptions()
	}

	public getInputOptions(input: GraphInputDefinition): string[] {
		if (input.enumId) return this.getEnumOptions(input.enumId)
		return []
	}

	public getEnumUsageCount(enumId: string): number {
		return this.getGraphs().reduce(
			(count, graph) => count + graph.model.getNodes().filter(
				(node) => node instanceof InputGraphNode && node.getEnumId() === enumId
			).length,
			0
		)
	}

	public addEnumDefinition(definition: EnumDefinitionSnapshot): void {
		if (this.enumDefinitions.has(definition.id)) {
			throw new Error(`Cannot add duplicate choice set "${definition.id}".`)
		}
		if (
			!definition.id.trim()
			|| !definition.name.trim()
			|| definition.options.length === 0
			|| definition.options.some((option) => !option || option.trim() !== option)
			|| new Set(definition.options).size !== definition.options.length
		) {
			throw new Error(
				`Cannot add choice set ${JSON.stringify(definition)}: ID and name must be non-empty, and `
				+ 'options must be non-empty, trimmed, and unique.'
			)
		}
		this.enumDefinitions.set(
			definition.id,
			new EnumDefinition(definition.id, definition.name, definition.options)
		)
	}

	public renameEnum(enumId: string, name: string): void {
		this.requireEnumEntity(enumId).setName(name)
	}

	public addEnumOption(enumId: string, option: string): void {
		this.requireEnumEntity(enumId).addOption(option)
	}

	public renameEnumOption(enumId: string, index: number, option: string): string {
		const definition = this.requireEnumEntity(enumId)
		const normalizedOption = option.trim()
		return definition.renameOption(index, normalizedOption)
	}

	public removeEnumOption(enumId: string, index: number): string {
		const definition = this.requireEnumEntity(enumId)
		const removedOption = definition.removeOption(index)
		this.reconcileEnumInputValues(enumId, (value) => value === index ? 0 : value > index ? value - 1 : value)
		return removedOption
	}

	public moveEnumOption(enumId: string, sourceIndex: number, targetIndex: number): void {
		this.requireEnumEntity(enumId).moveOption(sourceIndex, targetIndex)
		this.reconcileEnumInputValues(
			enumId,
			(value) => remapMovedIndex(value, sourceIndex, targetIndex)
		)
	}

	public setInputEnum(graphId: string, inputId: string, enumId: string): string | undefined {
		this.requireEnumEntity(enumId)
		const input = this.graphs.get(graphId)?.inputs.find((candidate) => candidate.id === inputId)
		if (!input || !['enum', 'primitiveArray'].includes(input.valueType)) return undefined
		const previousEnumId = input.enumId
		input.enumId = enumId
		if (!this.isInputValueCompatible(input, input.defaultValue ?? -1)) {
			input.defaultValue = 0
		}
		const root = this.rootGraphs.get(graphId)
		if (root) {
			const current = root.getInputValue(inputId)
			if (current !== undefined && !this.isInputValueCompatible(input, current)) {
				root.setInputValue(inputId, input.defaultValue ?? 0)
			}
			this.reconcileConfigurationTemplates(root)
		}
		this.reconcileLayoutInstances(graphId)
		if (previousEnumId && previousEnumId !== enumId) this.removeEnumIfUnused(previousEnumId)
		return previousEnumId
	}

	public getGraphs(): GraphDefinition[] {
		return [...this.graphs.values()]
	}

	public getGraph(graphId: string): GraphDefinition | undefined {
		return this.graphs.get(graphId)
	}

	public requireGraph(graphId: string): GraphDefinition {
		const graph = this.graphs.get(graphId)
		if (!graph) throw new Error(`Unknown graph "${graphId}"`)
		return graph
	}

	public getGraphInterface(graphId: string): GraphInterface | undefined {
		const graph = this.graphs.get(graphId)
		if (!graph) return undefined
		return {
			id: graph.id,
			label: graph.label,
			inputs: graph.inputs,
			output: graph.output,
		}
	}

	public addGraph(graph: GraphDefinition): void {
		if (this.graphs.has(graph.id)) throw new Error(`Duplicate graph ID "${graph.id}"`)
		this.graphs.set(graph.id, graph)
	}

	public addRootGraph(graphId: string): void {
		if (!this.graphs.has(graphId)) throw new Error(`Cannot add unknown graph "${graphId}" as a root`)
		if (this.rootGraphs.has(graphId)) throw new Error(`Graph "${graphId}" is already a root`)
		const root = new RootGraph(graphId, {}, [], [])
		this.rootGraphs.set(graphId, root)
		this.validateReferences(root)
	}

	public removeRootGraph(graphId: string): boolean {
		if (!this.rootGraphs.has(graphId) || this.rootGraphs.size === 1) return false
		this.rootGraphs.delete(graphId)
		this.layout.removeGraph(graphId)
		return true
	}

	public renameGraph(graphId: string, label: string): boolean {
		const graph = this.graphs.get(graphId)
		if (!graph || !label.trim()) return false
		graph.label = label.trim()
		return true
	}

	public removeGraph(graphId: string): boolean {
		if (!this.graphs.has(graphId)) return false
		if (this.rootGraphs.has(graphId) && this.rootGraphs.size === 1) return false
		const enumIds = this.graphs.get(graphId)?.model.getNodes().flatMap((node) => (
			node instanceof InputGraphNode && node.getEnumId() ? [node.getEnumId() as string] : []
		)) ?? []
		this.rootGraphs.delete(graphId)
		this.graphs.delete(graphId)
		this.layout.removeGraph(graphId)
		for (const enumId of enumIds) this.removeEnumIfUnused(enumId)
		return true
	}

	public addInput(graphId: string, input: GraphInputDefinition): boolean {
		const graph = this.graphs.get(graphId)
		if (!graph || graph.inputs.some((candidate) => candidate.id === input.id)) return false
		graph.inputs.push(copyGraphInput(input))
		return true
	}

	public updateInput(
		graphId: string,
		inputId: string,
		update: Partial<Omit<GraphInputDefinition, 'id' | 'valueType'>>
	): boolean {
		const input = this.graphs.get(graphId)?.inputs.find((candidate) => candidate.id === inputId)
		if (!input) return false
		if (update.label !== undefined) input.label = update.label
		if (update.defaultValue !== undefined) {
			input.defaultValue = Array.isArray(update.defaultValue)
				? [...update.defaultValue]
				: update.defaultValue
		}
		const root = this.rootGraphs.get(graphId)
		if (root) {
			const current = root.getInputValue(inputId)
			if (current !== undefined && !this.isInputValueCompatible(input, current)) {
				if (input.defaultValue !== undefined && this.isInputValueCompatible(input, input.defaultValue)) {
					root.setInputValue(inputId, input.defaultValue)
				} else {
					root.removeInputValue(inputId)
				}
			}
			this.validateReferences(root)
			this.reconcileConfigurationTemplates(root)
		}
		this.reconcileLayoutInstances(graphId)
		return true
	}

	public removeInput(graphId: string, inputId: string): boolean {
		const graph = this.graphs.get(graphId)
		if (!graph) return false
		const index = graph.inputs.findIndex((input) => input.id === inputId)
		if (index < 0) return false
		const [removedInput] = graph.inputs.splice(index, 1)
		const root = this.rootGraphs.get(graphId)
		if (root) {
			root.removeInputValue(inputId)
			root.setConfigurationControls(root.getConfigurationControls().filter(
				(control) => control.inputId !== inputId
			))
			this.reconcileConfigurationTemplates(root)
		}
		this.reconcileLayoutInstances(graphId)
		if (removedInput?.enumId) this.removeEnumIfUnused(removedInput.enumId)
		return true
	}

	public getRootInputValue(graphId: string, inputId: string): GraphInputValue | undefined {
		const input = this.requireGraph(graphId).inputs.find((candidate) => candidate.id === inputId)
		if (!input) return undefined
		const value = this.requireRootGraph(graphId).getInputValue(inputId) ?? input.defaultValue
		return value === undefined ? undefined : copyInputValue(value)
	}

	public setRootInputValue(graphId: string, inputId: string, value: GraphInputValue): boolean {
		const root = this.requireRootGraph(graphId)
		const input = this.requireGraph(graphId).inputs.find((candidate) => candidate.id === inputId)
		if (!input || !this.isInputValueCompatible(input, value)) return false
		root.setInputValue(inputId, value)
		return true
	}

	public getRootInputValues(graphId: string): Record<string, GraphInputValue> {
		return this.requireRootGraph(graphId).getInputValues()
	}

	public getConfigurationControls(graphId: string): ConfigurationPanelControl[] {
		return this.requireRootGraph(graphId).getConfigurationControls()
	}

	public getConfigurationTemplates(graphId: string): ConfigurationTemplate[] {
		return this.requireRootGraph(graphId).getConfigurationTemplates()
	}

	public setConfigurationControls(
		graphId: string,
		controls: ConfigurationPanelControl[]
	): void {
		const root = this.requireRootGraph(graphId)
		const rootInputs = new Map(this.requireGraph(graphId).inputs.map((input) => [input.id, input]))
		const controlIds = new Set<string>()
		const controlledInputs = new Set<string>()
		const configurationControls = controls.flatMap((control) => {
			const input = rootInputs.get(control.inputId)
			if (
				!input
				|| input.valueType === 'geometry'
				|| controlIds.has(control.id)
				|| controlledInputs.has(control.inputId)
				|| !isControlCompatible(input, control)
			) {
				return []
			}
			controlIds.add(control.id)
			controlledInputs.add(control.inputId)
			return [copyConfigurationControl(control)]
		})
		root.setConfigurationControls(configurationControls)
		this.validateReferences(root)
		this.reconcileConfigurationTemplates(root)
		this.reconcileLayoutInstances(graphId)
	}

	public createConfigurationTemplate(graphId: string, label: string): string {
		const root = this.requireRootGraph(graphId)
		const templates = root.getConfigurationTemplates()
		const normalizedLabel = this.requireAvailableConfigurationTemplateLabel(root, label)
		const templateId = this.createConfigurationTemplateId(templates)
		root.setConfigurationTemplates([
			...templates,
			{
				id: templateId,
				label: normalizedLabel,
				values: this.getConfigurationTemplateValues(root),
			},
		])
		return templateId
	}

	public removeConfigurationTemplate(graphId: string, templateId: string): void {
		const root = this.requireRootGraph(graphId)
		root.setConfigurationTemplates(root.getConfigurationTemplates().filter(
			(template) => template.id !== templateId
		))
	}

	public updateConfigurationTemplate(graphId: string, templateId: string): void {
		const root = this.requireRootGraph(graphId)
		const templates = root.getConfigurationTemplates()
		if (!templates.some((template) => template.id === templateId)) {
			throw new Error(
				`Cannot update configuration template "${templateId}" on root graph "${graphId}": `
				+ 'the template does not exist.'
			)
		}
		root.setConfigurationTemplates(templates.map((template) => (
			template.id === templateId
				? { ...template, values: this.getConfigurationTemplateValues(root) }
				: template
		)))
	}

	public renameConfigurationTemplate(graphId: string, templateId: string, label: string): void {
		const root = this.requireRootGraph(graphId)
		const templates = root.getConfigurationTemplates()
		if (!templates.some((template) => template.id === templateId)) {
			throw new Error(
				`Cannot rename configuration template "${templateId}" on root graph "${graphId}": `
				+ 'the template does not exist.'
			)
		}
		const normalizedLabel = this.requireAvailableConfigurationTemplateLabel(root, label, templateId)
		root.setConfigurationTemplates(templates.map((template) => (
			template.id === templateId ? { ...template, label: normalizedLabel } : template
		)))
	}

	public applyConfigurationTemplate(graphId: string, templateId: string): boolean {
		const root = this.requireRootGraph(graphId)
		const template = root.getConfigurationTemplates().find((candidate) => candidate.id === templateId)
		if (!template) return false
		for (const [inputId, value] of Object.entries(template.values)) {
			if (!this.setRootInputValue(graphId, inputId, value)) {
				throw new Error(
					`Cannot apply configuration template "${templateId}" on root graph "${graphId}": `
					+ `value for input "${inputId}" is incompatible after template reconciliation.`
				)
			}
		}
		return true
	}

	public isInputValueCompatible(
		input: GraphInputDefinition,
		value: GraphInputValue
	): boolean {
		return isInputValueCompatible(input, value, this.getInputOptions(input))
	}

	private validateReferences(root: RootGraph): void {
		const graphId = root.getGraphId()
		const graph = this.requireGraph(graphId)
		const rootInputIds = new Set(graph.inputs.map((input) => input.id))
		const controlIds = new Set<string>()
		const controlledInputs = new Set<string>()
		for (const control of root.getConfigurationControls()) {
			if (!control.id || !control.inputId || typeof control.label !== 'string') {
				throw new Error(`Root graph "${graphId}" has an invalid configuration control`)
			}
			if (!rootInputIds.has(control.inputId)) {
				throw new Error(
					`Configuration control "${control.id}" on root graph "${graphId}" references ` +
						`unknown root input "${control.inputId}"`
				)
			}
			const input = graph.inputs.find((candidate) => candidate.id === control.inputId)
			if (input?.valueType === 'geometry') {
				throw new Error(`Geometry input "${control.inputId}" cannot be shown in configuration`)
			}
			if (input && !isControlCompatible(input, control)) {
				throw new Error(
					`Configuration control "${control.id}" of type "${control.type}" is incompatible with `
					+ `root input "${control.inputId}" of type "${input.valueType}" on graph "${graphId}"`
				)
			}
			if (controlIds.has(control.id)) {
				throw new Error(`Duplicate configuration control ID "${control.id}"`)
			}
			if (controlledInputs.has(control.inputId)) {
				throw new Error(
					`Root input "${control.inputId}" on graph "${graphId}" has multiple ` +
						'configuration controls'
				)
			}
			controlIds.add(control.id)
			controlledInputs.add(control.inputId)
		}
	}

	private reconcileConfigurationTemplates(root: RootGraph): void {
		const controls = root.getConfigurationControls()
		const inputs = new Map(this.requireGraph(root.getGraphId()).inputs.map((input) => [input.id, input]))
		root.setConfigurationTemplates(root.getConfigurationTemplates().map((template) => ({
			...template,
			values: Object.fromEntries(controls.map((control) => {
				const input = inputs.get(control.inputId)
				if (!input || input.defaultValue === undefined) {
					throw new Error(
						`Cannot reconcile configuration template "${template.id}" on root graph "${root.getGraphId()}": `
						+ `control "${control.id}" has no defaultable input.`
					)
				}
				const value = template.values[input.id]
				return [input.id, this.isTemplateValueCompatible(input, control, value)
					? value
					: this.getDefaultConfigurationValue(input, control)]
			})),
		})))
	}

	private getConfigurationTemplateValues(root: RootGraph): Record<string, GraphInputValue> {
		return Object.fromEntries(root.getConfigurationControls().flatMap((control) => {
			const value = this.getRootInputValue(root.getGraphId(), control.inputId)
			return value === undefined ? [] : [[control.inputId, value]]
		}))
	}

	private isTemplateValueCompatible(
		input: GraphInputDefinition,
		_control: ConfigurationPanelControl,
		value: GraphInputValue | undefined
	): boolean {
		if (value === undefined || !this.isInputValueCompatible(input, value)) return false
		return true
	}

	private getDefaultConfigurationValue(
		input: GraphInputDefinition,
		_control: ConfigurationPanelControl
	): GraphInputValue {
		if (input.defaultValue === undefined) {
			throw new Error(`Configuration input "${input.id}" has no default value.`)
		}
		return copyInputValue(input.defaultValue)
	}

	private createConfigurationTemplateId(templates: ConfigurationTemplate[]): string {
		let number = templates.length + 1
		while (templates.some((template) => template.id === `configuration-${number}`)) number += 1
		return `configuration-${number}`
	}

	private requireAvailableConfigurationTemplateLabel(
		root: RootGraph,
		label: string,
		excludedTemplateId?: string
	): string {
		const normalizedLabel = label.trim()
		if (!normalizedLabel) {
			throw new Error(
				`Cannot save configuration template on root graph "${root.getGraphId()}": `
				+ 'the template name is empty.'
			)
		}
		const duplicate = root.getConfigurationTemplates().find((template) => (
			template.id !== excludedTemplateId
			&& template.label.localeCompare(normalizedLabel, undefined, { sensitivity: 'accent' }) === 0
		))
		if (duplicate) {
			throw new Error(
				`Cannot save configuration template "${normalizedLabel}" on root graph `
				+ `"${root.getGraphId()}": template "${duplicate.id}" already uses that name.`
			)
		}
		return normalizedLabel
	}

	private requireEnumEntity(enumId: string): EnumDefinition {
		const definition = this.enumDefinitions.get(enumId)
		if (!definition) throw new Error(`Unknown choice set "${enumId}"`)
		return definition
	}

	private reconcileEnumInputValues(enumId: string, remapIndex: (value: number) => number): void {
		for (const graph of this.graphs.values()) {
			for (const node of graph.model.getNodes()) {
				if (!(node instanceof InputGraphNode) || node.getValueType() !== 'enum' || node.getEnumId() !== enumId) {
					continue
				}
				const value = node.getValue()
				const defaultValue = typeof value === 'number' ? remapIndex(value) : 0
				node.setValue(defaultValue)
				if (!node.isExported()) continue
				const input = graph.inputs.find((candidate) => candidate.id === node.id)
				if (!input) continue
				input.defaultValue = defaultValue
				const root = this.rootGraphs.get(graph.id)
				if (!root) continue
				const current = root.getInputValue(input.id)
				if (typeof current === 'number') {
					root.setInputValue(input.id, remapIndex(current))
				} else if (current !== undefined && !this.isInputValueCompatible(input, current)) {
					root.setInputValue(input.id, input.defaultValue)
				}
				root.setConfigurationTemplates(root.getConfigurationTemplates().map((template) => ({
					...template,
					values: typeof template.values[input.id] === 'number'
						? { ...template.values, [input.id]: remapIndex(template.values[input.id] as number) }
						: template.values,
				})))
				this.remapLayoutInstanceInputValues(graph.id, input.id, remapIndex)
				this.reconcileConfigurationTemplates(root)
			}
		}
	}

	private reconcileLayoutInstances(graphId: string): void {
		const document = this.getProductData()
		const graph = this.requireGraph(graphId)
		for (const product of document.products) {
			for (const instance of product.instances) {
				if (instance.graphId !== graphId) continue
				for (const [inputId, value] of Object.entries(instance.inputValues)) {
					const input = graph.inputs.find((candidate) => candidate.id === inputId)
					if (!input || !this.isInputValueCompatible(input, value)) {
						delete instance.inputValues[inputId]
						continue
					}
				}
			}
		}
		this.layout = this.createLayoutModel(document)
	}

	private remapLayoutInstanceInputValues(
		graphId: string,
		inputId: string,
		remap: (value: number) => number
	): void {
		const document = this.getProductData()
		for (const product of document.products) {
			for (const instance of product.instances) {
				if (instance.graphId !== graphId || typeof instance.inputValues[inputId] !== 'number') continue
				instance.inputValues[inputId] = remap(instance.inputValues[inputId] as number)
			}
		}
		this.layout = this.createLayoutModel(document)
	}

	private createLayoutModel(productData: ProductDataDocument): LayoutModel {
		const rootGraphIds = [...this.rootGraphs.keys()]
		const document = createDefaultLayoutData(productData, rootGraphIds)
		const model = new LayoutModel(document)
		const snapshot = model.toDocument()
		for (const product of snapshot.products) {
			const layout = productLayoutRegistry.require(product.layoutId)
			for (const instance of product.instances) {
				if (!layout.canInstantiateGraph(instance.graphId, rootGraphIds)) {
					throw new Error(
						`Product "${product.id}" layout "${layout.id}" cannot instantiate graph `
						+ `"${instance.graphId}" for item "${instance.id}". Available root graphs: `
						+ `${JSON.stringify(rootGraphIds)}.`
					)
				}
			}
		}
		for (const slot of snapshot.slots) {
			for (const graphId of slot.graphs) {
				if (!this.rootGraphs.has(graphId)) {
					throw new Error(
						`Layout slot definition "${slot.id}" allows graph "${graphId}", but that graph `
						+ `is not a root graph. Available root graphs: `
						+ `${JSON.stringify([...this.rootGraphs.keys()])}.`
					)
				}
			}
		}
		return model
	}

	private requireProductInstance(
		productId: string,
		instanceId: string
	): LayoutGraphInstanceDocument {
		const instance = this.layout.requireProduct(productId).instances.find(
			(candidate) => candidate.id === instanceId
		)
		if (!instance) {
			throw new Error(`Product "${productId}" does not contain item "${instanceId}".`)
		}
		return instance
	}

	private assertProductConfigurationBindings(
		productId: string,
		configuration: ProductConfigurationDocument
	): void {
		const targets = new Set<string>()
		for (const control of configuration.controls) {
			if (control.type === 'sectionList') {
				const countInput = this.requireInput(productId, control.countTarget.instanceId, control.countTarget.inputId)
				if (countInput.valueType !== 'number') {
					throw new Error(`Section-list "${control.id}" count target must be a number input.`)
				}
				this.assertUniqueConfigurationTarget(targets, control.countTarget, control.id)
				for (const field of control.fields) {
					if (field.target.instanceId !== control.countTarget.instanceId) {
						throw new Error(`Section-list "${control.id}" cannot bind fields from different product items.`)
					}
					const input = this.requireInput(productId, field.target.instanceId, field.target.inputId)
				if (input.valueType !== 'primitiveArray' || !Array.isArray(input.defaultValue)
						|| !input.defaultValue.every((item) => typeof item === 'number')) {
						throw new Error(`Section-list field "${field.id}" must target a numeric or choice primitive-array input.`)
					}
					const widget = field.widget ?? (input.enumId ? 'select' : 'number')
					if (
						(input.enumId && widget !== 'select')
						|| (!input.enumId && widget === 'select')
						|| (widget === 'slider' && (!isValidRange(field.min, field.max) || !isValidStep(field.step)))
						|| (widget === 'number' && field.step !== undefined && !isValidStep(field.step))
					) {
						throw new Error(`Section-list field "${field.id}" has incompatible widget or bounds.`)
					}
					this.assertUniqueConfigurationTarget(targets, field.target, control.id)
				}
				continue
			}
			const input = this.requireInput(productId, control.target.instanceId, control.target.inputId)
			if (!isProductControlCompatible(input, control)) {
				throw new Error(`Configuration control "${control.id}" is incompatible with input "${input.id}".`)
			}
			this.assertUniqueConfigurationTarget(targets, control.target, control.id)
		}
	}

	private assertUniqueConfigurationTarget(
		targets: Set<string>,
		target: { instanceId: string; inputId: string },
		controlId: string
	): void {
		const key = `${target.instanceId}:${target.inputId}`
		if (targets.has(key)) throw new Error(`Configuration control "${controlId}" duplicates target "${key}".`)
		targets.add(key)
	}

	private requireProductConfigurationControl(productId: string, controlId: string): ProductConfigurationControl {
		const configuration = this.layout.requireProduct(productId).configuration
		const control = configuration?.controls.find((candidate) => candidate.id === controlId)
		if (!control) throw new Error(`Product "${productId}" has no configuration control "${controlId}".`)
		return control
	}

	private requireSectionListControl(
		productId: string,
		controlId: string
	): Extract<ProductConfigurationControl, { type: 'sectionList' }> {
		const control = this.requireProductConfigurationControl(productId, controlId)
		if (control.type !== 'sectionList') throw new Error(`Configuration control "${controlId}" is not a section list.`)
		return control
	}

	private requireInput(productId: string, instanceId: string, inputId: string): GraphInputDefinition {
		const instance = this.requireProductInstance(productId, instanceId)
		const input = this.requireGraph(instance.graphId).inputs.find((candidate) => candidate.id === inputId)
		if (!input) throw new Error(`Product item "${instanceId}" has no public input "${inputId}".`)
		return input
	}

	private getSectionListValues(
		productId: string,
		control: Extract<ProductConfigurationControl, { type: 'sectionList' }>
	): Array<Record<string, number>> {
		const arrays = control.fields.map((field) => {
			const instance = this.requireProductInstance(productId, field.target.instanceId)
			const input = this.requireInput(productId, field.target.instanceId, field.target.inputId)
			const value = instance.inputValues[field.target.inputId] ?? input.defaultValue
			const defaultValue = this.getSectionFieldDefaultValue(productId, control, field, input)
			if (!Array.isArray(value)) {
				console.warn(
					`Section-list "${control.id}" field "${field.id}" on product "${productId}" expected `
					+ `an array at input "${input.id}" but received ${JSON.stringify(value)}. `
					+ 'Treating it as an empty array so the section action can continue.'
				)
				return { field, input, value: [] as number[] }
			}
			const normalized = value.map((item) => typeof item === 'number' && Number.isFinite(item)
				? item
				: defaultValue
			)
			if (normalized.some((item, index) => item !== value[index])) {
				console.warn(
					`Section-list "${control.id}" field "${field.id}" on product "${productId}" normalized `
					+ `non-numeric values from ${JSON.stringify(value)} to ${JSON.stringify(normalized)} before editing.`
				)
			}
			return { field, input, value: normalized }
		})
		const length = Math.max(0, ...arrays.map((item) => item.value.length))
		return Array.from({ length }, (_, index) => Object.fromEntries(arrays.map(({ field, input, value }) => [
			field.id,
			value[index] ?? this.getSectionFieldDefaultValue(productId, control, field, input),
		])) as Record<string, number>)
	}

	private writeSectionListValues(
		productId: string,
		control: Extract<ProductConfigurationControl, { type: 'sectionList' }>,
		values: Array<Record<string, number>>
	): void {
		for (const field of control.fields) {
			const input = this.requireInput(productId, field.target.instanceId, field.target.inputId)
			const defaultValue = this.getSectionFieldDefaultValue(productId, control, field, input)
			const next = values.map((item) => Number.isFinite(item[field.id]) ? item[field.id] : defaultValue)
			if (next.some((item, index) => item !== values[index]?.[field.id])) {
				console.warn(
					`Section-list "${control.id}" field "${field.id}" on product "${productId}" replaced `
					+ `non-finite output values with default ${defaultValue} before writing input "${input.id}".`
				)
			}
			this.layout.setInstanceInputValue(productId, field.target.instanceId, field.target.inputId, next)
		}
		this.layout.setInstanceInputValue(
			productId,
			control.countTarget.instanceId,
			control.countTarget.inputId,
			values.length
		)
	}

	private getSectionFieldDefaultValue(
		productId: string,
		control: Extract<ProductConfigurationControl, { type: 'sectionList' }>,
		field: Extract<ProductConfigurationControl, { type: 'sectionList' }>['fields'][number],
		input: GraphInputDefinition
	): number {
		if (input.enumId) {
			const options = this.getInputOptions(input)
			if (options.length === 0) {
				console.warn(
					`Section-list "${control.id}" field "${field.id}" on product "${productId}" targets `
					+ `input "${input.id}" with empty choice set "${input.enumId}". Using index 0 so the `
					+ 'section action can continue.'
				)
			}
			return 0
		}
		const minimum = Number.isFinite(field.min) ? field.min as number : 0
		const maximum = Number.isFinite(field.max) ? field.max as number : undefined
		if (
			(field.min !== undefined && !Number.isFinite(field.min))
			|| (field.max !== undefined && !Number.isFinite(field.max))
			|| (maximum !== undefined && minimum > maximum)
		) {
			console.warn(
				`Section-list "${control.id}" field "${field.id}" on product "${productId}" has unusable `
				+ `numeric bounds min=${JSON.stringify(field.min)}, max=${JSON.stringify(field.max)} for `
				+ `input "${input.id}". Using the nearest finite value so the section action can continue.`
			)
		}
		return maximum === undefined ? minimum : Math.min(minimum, maximum)
	}

	private getInitialLayoutInputValues(graphId: string): Record<string, GraphInputValue> {
		this.requireGraph(graphId)
		return {}
	}

	public removeEnumIfUnused(enumId: string): void {
		if (this.getEnumUsageCount(enumId) === 0) this.enumDefinitions.delete(enumId)
	}
}

function isControlCompatible(
	input: GraphInputDefinition,
	control: ConfigurationPanelControl
): boolean {
	if (input.valueType === 'number') {
		if (control.type === 'number') {
			return Number.isFinite(control.step) && control.step > 0
		}
		if (control.type === 'slider') {
			return Number.isFinite(control.min)
				&& Number.isFinite(control.max)
				&& control.min < control.max
				&& Number.isFinite(control.step)
				&& control.step > 0
		}
		return false
	}
	if (input.valueType === 'enum') return control.type === 'select'
	if (input.valueType === 'materialInstance') return control.type === 'material'
	if (input.valueType === 'boolean') return control.type === 'switch'
	if (input.valueType === 'primitiveArray') return control.type === 'primitiveArray'
	return false
}

function isProductControlCompatible(
	input: GraphInputDefinition,
	control: Exclude<ProductConfigurationControl, { type: 'sectionList' }>
): boolean {
	return ((control.type === 'number' || control.type === 'slider') && input.valueType === 'number'
		&& (control.type !== 'slider' || (isValidRange(control.min, control.max) && isValidStep(control.step))))
		|| (control.type === 'select' && input.valueType === 'enum')
		|| (control.type === 'material' && input.valueType === 'materialInstance')
		|| (control.type === 'switch' && input.valueType === 'boolean')
		|| (control.type === 'color' && input.valueType === 'color')
		|| (control.type === 'vector3' && input.valueType === 'vector3')
}

function isValidRange(min: number | undefined, max: number | undefined): boolean {
	return Number.isFinite(min) && Number.isFinite(max) && (min as number) < (max as number)
}

function isValidStep(step: number | undefined): boolean {
	return Number.isFinite(step) && (step as number) > 0
}

function copyGraphInput(input: GraphInputDefinition): GraphInputDefinition {
	return {
		...input,
		defaultValue: input.defaultValue === undefined ? undefined : copyInputValue(input.defaultValue),
	}
}

function copyConfigurationControl(
	control: ConfigurationPanelControl
): ConfigurationPanelControl {
	return { ...control }
}


export function isInputValueCompatible(
	input: GraphInputDefinition,
	value: GraphInputValue,
	options: readonly string[] = []
): boolean {
	if (input.valueType === 'number') return typeof value === 'number' && Number.isFinite(value)
	if (input.valueType === 'vector3') return isVector3Snapshot(value)
	if (input.valueType === 'primitiveArray') {
		return Array.isArray(value) && value.every((item) => (
			typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))
		))
	}
	if (input.valueType === 'enum') return isEnumIndex(value, options)
	if (input.valueType === 'materialInstance') return typeof value === 'string' && value.trim().length > 0
	if (input.valueType === 'color') return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
	if (input.valueType === 'boolean') return typeof value === 'boolean'
	return false
}

function isEnumIndex(value: unknown, options: readonly string[]): value is number {
	return Number.isInteger(value) && (value as number) >= 0 && (value as number) < options.length
}

function isVector3Snapshot(value: unknown): value is Vector3Snapshot {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const vector = value as Partial<Vector3Snapshot>
	return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)
}

function copyInputValue(value: GraphInputValue): GraphInputValue {
	if (Array.isArray(value)) return [...value]
	if (isVector3Snapshot(value)) return { ...value }
	return value
}

export function remapMovedIndex(value: number, sourceIndex: number, targetIndex: number): number {
	if (value === sourceIndex) return targetIndex
	if (sourceIndex < targetIndex && value > sourceIndex && value <= targetIndex) return value - 1
	if (sourceIndex > targetIndex && value >= targetIndex && value < sourceIndex) return value + 1
	return value
}
