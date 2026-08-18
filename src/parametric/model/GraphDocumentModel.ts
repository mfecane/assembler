import type { GraphValueType } from '@/parametric/model/GraphNode'
import type { GraphModel } from '@/parametric/model/GraphModel'
import {
	EnumDefinition,
	type EnumDefinitionSnapshot,
} from '@/parametric/model/EnumDefinition'
import { isRgbColor } from '@/parametric/model/ColorPalette'
import { RootGraph } from '@/parametric/model/RootGraph'
import type { Client } from '@/cosntants'

export type GraphInputValue = number | number[] | string | boolean
export type GraphInputValueType = Exclude<GraphValueType, 'meshArray' | 'vector3'>

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
	| (ConfigurationPanelControlBase & { type: 'color'; options: string[] })
	| (ConfigurationPanelControlBase & { type: 'switch' })
	| (ConfigurationPanelControlBase & {
		type: 'numberArray'
		labels: string[]
		total: number
		step: number
	})

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
		total: number
		step: number
	}
	| { id: string; type: 'enum'; label: string; value: number; options: string[] }
	| { id: string; type: 'color'; label: string; value: string; options: string[] }
	| { id: string; type: 'boolean'; label: string; value: boolean }

export class GraphDocumentModel {
	private readonly graphs = new Map<string, GraphDefinition>()
	private readonly enumDefinitions = new Map<string, EnumDefinition>()
	private readonly rootGraphs = new Map<string, RootGraph>()

	public constructor(
		private readonly client: Client,
		rootGraphs: RootGraph[],
		enumDefinitions: EnumDefinitionSnapshot[],
		graphs: GraphDefinition[]
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
			this.rootGraphs.set(graphId, root)
		}
		for (const root of this.rootGraphs.values()) {
			this.validateReferences(root)
			this.validateConfigurationValues(root)
		}
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
		if (input.valueType === 'enum') return this.getEnumOptions(input.enumId ?? '')
		return []
	}

	public getEnumUsageCount(enumId: string): number {
		return this.getGraphs().reduce(
			(count, graph) => count + graph.inputs.filter((input) => input.enumId === enumId).length,
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
		}
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
		const root = new RootGraph(graphId, {}, [])
		this.rootGraphs.set(graphId, root)
		this.validateReferences(root)
	}

	public removeRootGraph(graphId: string): boolean {
		if (!this.rootGraphs.has(graphId) || this.rootGraphs.size === 1) return false
		this.rootGraphs.delete(graphId)
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
		const enumIds = this.graphs.get(graphId)?.inputs.flatMap((input) => (
			input.enumId ? [input.enumId] : []
		)) ?? []
		this.rootGraphs.delete(graphId)
		this.graphs.delete(graphId)
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
			const colorControl = input.valueType === 'color'
				? root.getConfigurationControls()
					.filter(isColorConfigurationControl)
					.find((control) => control.inputId === input.id)
				: undefined
			if (
				colorControl
				&& !colorControl.options.includes(this.getRootInputValue(graphId, input.id) as string)
			) {
				root.setInputValue(input.id, colorControl.options[0])
			}
			this.validateReferences(root)
			this.validateConfigurationValues(root)
		}
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
		}
		if (removedInput?.enumId) this.removeEnumIfUnused(removedInput.enumId)
		return true
	}

	public getRootInputValue(graphId: string, inputId: string): GraphInputValue | undefined {
		const input = this.requireGraph(graphId).inputs.find((candidate) => candidate.id === inputId)
		if (!input) return undefined
		const value = this.requireRootGraph(graphId).getInputValue(inputId) ?? input.defaultValue
		return Array.isArray(value) ? [...value] : value
	}

	public setRootInputValue(graphId: string, inputId: string, value: GraphInputValue): boolean {
		const root = this.requireRootGraph(graphId)
		const input = this.requireGraph(graphId).inputs.find((candidate) => candidate.id === inputId)
		if (!input || !this.isInputValueCompatible(input, value)) return false
		const colorControl = root.getConfigurationControls()
			.filter(isColorConfigurationControl)
			.find((control) => control.inputId === inputId)
		if (colorControl && !colorControl.options.includes(value as string)) return false
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
			if (control.type === 'color' && !control.options.includes(value as string)) {
				root.setInputValue(control.inputId, control.options[0])
			}
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
			if (control.type === 'color') {
				const value = this.getRootInputValue(graphId, control.inputId)
				if (!control.options.includes(value as string)) {
					throw new Error(
						`Color configuration control "${control.id}" for root input `
						+ `"${control.inputId}" cannot display its current value ${JSON.stringify(value)}. `
						+ `Available colors: ${JSON.stringify(control.options)}.`
					)
				}
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

	private requireEnumEntity(enumId: string): EnumDefinition {
		const definition = this.enumDefinitions.get(enumId)
		if (!definition) throw new Error(`Unknown choice set "${enumId}"`)
		return definition
	}

	private reconcileEnumInputValues(enumId: string, remapIndex: (value: number) => number): void {
		for (const graph of this.graphs.values()) {
			for (const input of graph.inputs) {
				if (input.valueType !== 'enum' || input.enumId !== enumId) continue
				input.defaultValue = typeof input.defaultValue === 'number'
					? remapIndex(input.defaultValue)
					: 0
				const root = this.rootGraphs.get(graph.id)
				if (!root) continue
				const current = root.getInputValue(input.id)
				if (typeof current === 'number') {
					root.setInputValue(input.id, remapIndex(current))
				} else if (current !== undefined && !this.isInputValueCompatible(input, current)) {
					root.setInputValue(input.id, input.defaultValue)
				}
			}
		}
	}

	private removeEnumIfUnused(enumId: string): void {
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
	if (input.valueType === 'color') return control.type === 'color'
	if (input.valueType === 'boolean') return control.type === 'switch'
	if (input.valueType === 'numberArray') return control.type === 'numberArray'
	return false
}

function copyGraphInput(input: GraphInputDefinition): GraphInputDefinition {
	return Array.isArray(input.defaultValue)
		? { ...input, defaultValue: [...input.defaultValue] }
		: { ...input }
}

function copyConfigurationControl(
	control: ConfigurationPanelControl
): ConfigurationPanelControl {
	if (control.type === 'color') return { ...control, options: [...control.options] }
	if (control.type === 'numberArray') return { ...control, labels: [...control.labels] }
	return { ...control }
}

function isColorConfigurationControl(
	control: ConfigurationPanelControl
): control is Extract<ConfigurationPanelControl, { type: 'color' }> {
	return control.type === 'color'
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
	if (control.type !== 'color') return
	const options = Array.isArray(control.options) ? control.options : []
	const invalidOptions = options.filter((option) => (
		typeof option !== 'string' || !isRgbColor(option)
	))
	if (
		!Array.isArray(control.options)
		|| options.length === 0
		|| new Set(options).size !== options.length
		|| invalidOptions.length > 0
	) {
		throw new Error(
			`Color configuration control "${control.id}" for root input "${control.inputId}" `
			+ 'requires a non-empty, unique list of #RRGGBB colors. '
			+ `Received ${JSON.stringify(control.options)}; invalid colors: `
			+ `${JSON.stringify(invalidOptions)}.`
		)
	}
}

export function isInputValueCompatible(
	input: GraphInputDefinition,
	value: GraphInputValue,
	options: readonly string[] = []
): boolean {
	if (input.valueType === 'number') return typeof value === 'number' && Number.isFinite(value)
	if (input.valueType === 'numberArray') {
		return Array.isArray(value)
			&& value.every((item) => Number.isFinite(item) && item >= 0)
	}
	if (input.valueType === 'enum') {
		return Number.isInteger(value) && (value as number) >= 0 && (value as number) < options.length
	}
	if (input.valueType === 'color') {
		return typeof value === 'string' && isRgbColor(value)
	}
	if (input.valueType === 'boolean') return typeof value === 'boolean'
	return false
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
