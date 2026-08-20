import { InputGraphNode, type GraphValueType } from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import type { GraphModel, GraphModelReader } from '@/parametric/model/GraphModel'
import {
	EnumDefinition,
	type EnumDefinitionSnapshot,
} from '@/parametric/model/EnumDefinition'
import { RootGraph } from '@/parametric/model/RootGraph'
import type { Client } from '@/cosntants'
import {
	LayoutModel,
	type LayoutDataDocument,
	type LayoutGraphInstanceDocument,
	type LayoutInstanceBoundsDocument,
	type LayoutRangeDocument,
	type LayoutSlotDocument,
	type ProductDocument,
} from '@/layout/LayoutDocument'
import {
	assertLayoutInstanceMetadata,
	type LayoutAxisRole,
	assertRootGraphLayoutMetadata,
	type RootGraphAxisBinding,
	type RootGraphLayoutMetadata,
} from '@/layout/GraphLayoutMetadata'

export type GraphInputValue = number | number[] | Vector3Snapshot | string | boolean
export type GraphInputValueType = Exclude<GraphValueType, 'meshArray'>

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
	| (ConfigurationPanelControlBase & {
		type: 'numberArray'
		labels: string[]
		total: number
		step: number
	})

export interface ConfigurationTemplate {
	id: string
	label: string
	values: Record<string, GraphInputValue>
}

export type ConfigurationField =
	| { id: string; type: 'number'; label: string; value: number; step: number }
	| {
		id: string
		type: 'slider'
		label: string
		value: number
		min: number
		max: number
		step: number
	}
	| {
		id: string
		type: 'numberArray'
		label: string
		value: number[]
		labels: string[]
		total?: number
		step: number
	}
	| { id: string; type: 'enum'; label: string; value: number; options: string[] }
	| { id: string; type: 'material'; label: string; value: string }
	| { id: string; type: 'color'; label: string; value: string }
	| { id: string; type: 'vector3'; label: string; value: Vector3Snapshot; step: number }
	| { id: string; type: 'boolean'; label: string; value: boolean }

export interface GraphDocumentReader {
	getLayout(): LayoutDataDocument
	getRootGraphs(): RootGraphReader[]
	getRootGraphLayoutMetadata(graphId: string): RootGraphLayoutMetadata | undefined
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
		layout: LayoutDataDocument
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
		for (const product of layout.products) {
			for (const instance of product.instances) {
				assertLayoutInstanceMetadata(this.requireGraph(instance.graphId), instance.layoutMetadata)
			}
		}
		if (rootGraphs.length === 0) throw new Error('Graph document requires at least one root graph')
		for (const root of rootGraphs) {
			const graphId = root.getGraphId()
			if (this.rootGraphs.has(graphId)) throw new Error(`Duplicate root graph "${graphId}"`)
			const graph = this.graphs.get(graphId)
			if (!graph) throw new Error(`Root references unknown graph "${graphId}"`)
			for (const [inputId, value] of Object.entries(root.getInputValues())) {
				const input = graph.inputs.find((candidate) => candidate.id === inputId)
				if (!input || !this.isInputValueCompatible(input, value)) {
					throw new Error(
						`Root graph "${graphId}" has invalid value ${JSON.stringify(value)} ` +
							`for input "${inputId}"`
					)
				}
			}
			for (const control of root.getConfigurationControls()) assertConfigurationControl(control)
			assertRootGraphLayoutMetadata(graph, root.getLayoutMetadata())
			this.rootGraphs.set(graphId, root)
		}
		for (const root of this.rootGraphs.values()) {
			this.validateReferences(root)
			this.validateConfigurationValues(root)
			this.reconcileConfigurationTemplates(root)
		}
		this.layout = this.createLayoutModel(layout)
	}

	public getLayout(): LayoutDataDocument {
		return this.layout.toDocument()
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

	public removeProduct(productId: string): void {
		this.layout.removeProduct(productId)
	}

	public setProductLayout(productId: string, layoutId: string): void {
		this.layout.setProductLayout(productId, layoutId)
	}

	public setLayoutConfigurationHeader(layoutId: string, header: string): void {
		this.layout.setConfigurationHeader(layoutId, header)
	}

	public setLayoutSlot(layoutId: string, slotId: string): void {
		this.layout.setLayoutSlot(layoutId, slotId)
	}

	public addDefaultProductInstance(productId: string, instanceId: string): void {
		const product = this.layout.requireProduct(productId)
		const layout = this.layout.requireLayout(product.layoutId)
		const slot = this.layout.requireSlot(layout.slotId)
		const graphId = slot.graphs[0]
		if (!graphId) {
			throw new Error(
				`Cannot add an item to product "${productId}" because slot `
				+ `"${slot.id}" allows no root graphs.`
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

	public setProductInstanceGraph(productId: string, instanceId: string, graphId: string): void {
		const product = this.layout.requireProduct(productId)
		const layout = this.layout.requireLayout(product.layoutId)
		const slot = this.layout.requireSlot(layout.slotId)
		if (!slot.graphs.includes(graphId)) {
			throw new Error(
				`Cannot put graph "${graphId}" in item "${instanceId}" of product "${productId}": `
				+ `slot definition "${slot.id}" allows ${JSON.stringify(slot.graphs)}.`
			)
		}
		this.requireRootGraph(graphId)
		this.layout.setInstanceGraph(
			productId,
			instanceId,
			graphId,
			this.getInitialLayoutInputValues(graphId)
		)
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
		this.assertConfigurationValue(instance.graphId, inputId, value, instanceId)
		this.layout.setInstanceInputValue(productId, instanceId, inputId, value)
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

	public setProductInstanceLayoutAxisBinding(
		productId: string,
		instanceId: string,
		role: LayoutAxisRole,
		path: string | null
	): void {
		const instance = this.requireProductInstance(productId, instanceId)
		const graph = this.requireGraph(instance.graphId)
		const axisBinding = { ...instance.layoutMetadata?.axisBinding }
		if (path) axisBinding[role] = path
		else delete axisBinding[role]
		const metadata = Object.keys(axisBinding).length > 0 ? { axisBinding } : undefined
		assertLayoutInstanceMetadata(graph, metadata)
		this.layout.setInstanceLayoutMetadata(productId, instanceId, metadata)
	}

	public setRootGraphLayoutAxisBinding(
		graphId: string,
		role: LayoutAxisRole,
		binding: RootGraphAxisBinding | null
	): void {
		const root = this.requireRootGraph(graphId)
		const axisBinding = { ...root.getLayoutMetadata()?.axisBinding }
		if (binding) axisBinding[role] = { ...binding }
		else delete axisBinding[role]
		const metadata = Object.keys(axisBinding).length > 0 ? { axisBinding } : undefined
		assertRootGraphLayoutMetadata(this.requireGraph(graphId), metadata)
		root.setLayoutMetadata(metadata)
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

	public getRootGraphLayoutMetadata(graphId: string): RootGraphLayoutMetadata | undefined {
		return this.requireRootGraph(graphId).getLayoutMetadata()
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
		if (input.valueType === 'enum') return this.getEnumOptions(input.enumId ?? '')
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
		if (input?.valueType !== 'enum') return undefined
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
			this.validateConfigurationValues(root)
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
		this.reconcileLayoutInstanceMetadata(graphId, inputId)
		const root = this.rootGraphs.get(graphId)
		if (root) {
			root.removeInputValue(inputId)
			root.setConfigurationControls(root.getConfigurationControls().filter(
				(control) => control.inputId !== inputId
			))
			this.reconcileConfigurationTemplates(root)
			this.reconcileRootGraphLayoutMetadata(graphId, inputId)
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
		const numberArrayControl = root.getConfigurationControls().find(
			(control) => control.type === 'numberArray' && control.inputId === inputId
		)
		if (
			numberArrayControl?.type === 'numberArray'
			&& (
				!Array.isArray(value)
				|| value.length !== numberArrayControl.labels.length
				|| value.reduce((total, item) => total + item, 0) > numberArrayControl.total
			)
		) return false
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
		const previousControls = root.getConfigurationControls()
		for (const control of controls) assertConfigurationControl(control)
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
		for (const control of configurationControls) {
			const value = this.getRootInputValue(graphId, control.inputId)
			if (control.type === 'numberArray') {
				const current = Array.isArray(value) ? value : []
				const previous = previousControls.find((candidate) => (
					candidate.id === control.id && candidate.type === 'numberArray'
				))
				root.setInputValue(
					control.inputId,
					reconcileNumberArray(
						current,
						control.labels,
						control.total,
						previous?.type === 'numberArray' ? previous.labels : undefined
					)
				)
			}
		}
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
			assertConfigurationControl(control)
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

	private validateConfigurationValues(root: RootGraph): void {
		const graphId = root.getGraphId()
		for (const control of root.getConfigurationControls()) {
			if (control.type !== 'numberArray') continue
			const value = this.getRootInputValue(graphId, control.inputId)
			if (
				!Array.isArray(value)
				|| value.length !== control.labels.length
				|| value.reduce((total, item) => total + item, 0) > control.total
			) {
				throw new Error(
					`Number-array configuration control "${control.id}" on root graph "${graphId}" `
					+ `requires ${control.labels.length} values totaling at most ${control.total}. `
					+ `Received ${JSON.stringify(value)}.`
				)
			}
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
		control: ConfigurationPanelControl,
		value: GraphInputValue | undefined
	): boolean {
		if (value === undefined || !this.isInputValueCompatible(input, value)) return false
		return control.type !== 'numberArray'
			|| (Array.isArray(value)
				&& value.length === control.labels.length
				&& value.reduce((total, item) => total + item, 0) <= control.total)
	}

	private getDefaultConfigurationValue(
		input: GraphInputDefinition,
		control: ConfigurationPanelControl
	): GraphInputValue {
		if (input.defaultValue === undefined) {
			throw new Error(`Configuration input "${input.id}" has no default value.`)
		}
		if (control.type !== 'numberArray') return copyInputValue(input.defaultValue)
		return reconcileNumberArray(
			Array.isArray(input.defaultValue) ? input.defaultValue : [],
			control.labels,
			control.total
		)
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
		const document = this.layout.toDocument()
		const graph = this.requireGraph(graphId)
		const controls = new Map(
			(this.rootGraphs.get(graphId)?.getConfigurationControls() ?? []).map(
				(control) => [control.inputId, control]
			)
		)
		for (const product of document.products) {
			for (const instance of product.instances) {
				if (instance.graphId !== graphId) continue
				for (const [inputId, value] of Object.entries(instance.inputValues)) {
					const input = graph.inputs.find((candidate) => candidate.id === inputId)
					if (!input || !this.isInputValueCompatible(input, value)) {
						delete instance.inputValues[inputId]
						continue
					}
					const control = controls.get(inputId)
					if (
						control?.type === 'numberArray'
						&& (
							!Array.isArray(value)
							|| value.length !== control.labels.length
							|| value.reduce((total, item) => total + item, 0) > control.total
						)
					) {
						instance.inputValues[inputId] = this.getDefaultConfigurationValue(input, control)
					}
				}
			}
		}
		this.layout = this.createLayoutModel(document)
	}

	private reconcileLayoutInstanceMetadata(graphId: string, inputId: string): void {
		const document = this.layout.toDocument()
		for (const product of document.products) {
			for (const instance of product.instances) {
				if (instance.graphId !== graphId || !instance.layoutMetadata) continue
				for (const role of Object.keys(instance.layoutMetadata.axisBinding) as LayoutAxisRole[]) {
					const path = instance.layoutMetadata.axisBinding[role]
					if (path === inputId || path?.startsWith(`${inputId}.`)) {
						delete instance.layoutMetadata.axisBinding[role]
					}
				}
				if (Object.keys(instance.layoutMetadata.axisBinding).length === 0) {
					instance.layoutMetadata = undefined
				}
			}
		}
		this.layout = this.createLayoutModel(document)
	}

	private reconcileRootGraphLayoutMetadata(graphId: string, inputId: string): void {
		const root = this.rootGraphs.get(graphId)
		const metadata = root?.getLayoutMetadata()
		if (!root || !metadata) return
		for (const role of Object.keys(metadata.axisBinding) as LayoutAxisRole[]) {
			if (metadata.axisBinding[role]?.inputId === inputId) delete metadata.axisBinding[role]
		}
		root.setLayoutMetadata(Object.keys(metadata.axisBinding).length > 0 ? metadata : undefined)
	}

	private remapLayoutInstanceInputValues(
		graphId: string,
		inputId: string,
		remap: (value: number) => number
	): void {
		const document = this.layout.toDocument()
		for (const product of document.products) {
			for (const instance of product.instances) {
				if (instance.graphId !== graphId || typeof instance.inputValues[inputId] !== 'number') continue
				instance.inputValues[inputId] = remap(instance.inputValues[inputId] as number)
			}
		}
		this.layout = this.createLayoutModel(document)
	}

	private createLayoutModel(document: LayoutDataDocument): LayoutModel {
		const model = new LayoutModel(document)
		const snapshot = model.toDocument()
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
		for (const product of snapshot.products) {
			for (const instance of product.instances) this.validateLayoutInstance(product.id, instance)
		}
		return model
	}

	private validateLayoutInstance(
		productId: string,
		instance: LayoutGraphInstanceDocument
	): void {
		const graph = this.requireGraph(instance.graphId)
		for (const [inputId, value] of Object.entries(instance.inputValues)) {
			const input = graph.inputs.find((candidate) => candidate.id === inputId)
			if (!input || !this.isInputValueCompatible(input, value)) {
				throw new Error(
					`Product item "${instance.id}" in product "${productId}" has invalid value `
					+ `${JSON.stringify(value)} for input "${inputId}" on graph "${graph.id}".`
				)
			}
			this.assertConfigurationValue(graph.id, inputId, value, instance.id)
		}
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

	private getInitialLayoutInputValues(graphId: string): Record<string, GraphInputValue> {
		const template = this.getConfigurationTemplates(graphId)[0]
		return template ? template.values : {}
	}

	private assertConfigurationValue(
		graphId: string,
		inputId: string,
		value: GraphInputValue,
		instanceId: string
	): void {
		const control = this.getConfigurationControls(graphId).find(
			(candidate) => candidate.inputId === inputId
		)
		if (
			control?.type === 'numberArray'
			&& (
				!Array.isArray(value)
				|| value.length !== control.labels.length
				|| value.reduce((total, item) => total + item, 0) > control.total
			)
		) {
			throw new Error(
				`Layout graph instance "${instanceId}" input "${inputId}" must contain `
				+ `${control.labels.length} non-negative values totaling at most ${control.total}. `
				+ `Received ${JSON.stringify(value)}.`
			)
		}
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
	if (input.valueType === 'numberArray') return control.type === 'numberArray'
	return false
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
	if (control.type === 'numberArray') return { ...control, labels: [...control.labels] }
	return { ...control }
}

function assertConfigurationControl(control: ConfigurationPanelControl): void {
	if (control.type === 'numberArray') {
		if (
			control.labels.length === 0
			|| control.labels.some((label) => typeof label !== 'string' || !label.trim())
			|| !Number.isFinite(control.total)
			|| control.total < 0
			|| !Number.isFinite(control.step)
			|| control.step <= 0
		) {
			throw new Error(
				`Number-array configuration control "${control.id}" for root input `
				+ `"${control.inputId}" requires non-empty labels, a non-negative finite total, and `
				+ `a positive finite step. Received labels ${JSON.stringify(control.labels)}, total `
				+ `${JSON.stringify(control.total)}, step ${JSON.stringify(control.step)}.`
			)
		}
		return
	}
}

export function isInputValueCompatible(
	input: GraphInputDefinition,
	value: GraphInputValue,
	options: readonly string[] = []
): boolean {
	if (input.valueType === 'number') return typeof value === 'number' && Number.isFinite(value)
	if (input.valueType === 'vector3') return isVector3Snapshot(value)
	if (input.valueType === 'numberArray') {
		return Array.isArray(value)
			&& value.every((item) => Number.isFinite(item) && item >= 0)
	}
	if (input.valueType === 'enum') {
		return Number.isInteger(value) && (value as number) >= 0 && (value as number) < options.length
	}
	if (input.valueType === 'materialInstance') return typeof value === 'string' && value.trim().length > 0
	if (input.valueType === 'color') return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
	if (input.valueType === 'boolean') return typeof value === 'boolean'
	return false
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

function reconcileNumberArray(
	values: number[],
	labels: string[],
	total: number,
	previousLabels?: string[]
): number[] {
	const alignedValues = [...values]
	if (previousLabels && labels.length < previousLabels.length) {
		const removedIndex = previousLabels.findIndex((label, index) => label !== labels[index])
		alignedValues.splice(removedIndex < 0 ? labels.length : removedIndex, 1)
	} else if (previousLabels && labels.length > previousLabels.length) {
		const addedIndex = labels.findIndex((label, index) => label !== previousLabels[index])
		alignedValues.splice(addedIndex < 0 ? previousLabels.length : addedIndex, 0, 0)
	}
	let remaining = total
	return Array.from({ length: labels.length }, (_, index) => {
		const value = Math.min(alignedValues[index] ?? 0, remaining)
		remaining -= value
		return value
	})
}
