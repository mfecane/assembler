import type { GraphValueType } from '@/parametric/model/GraphNode'
import type { GraphModel } from '@/parametric/model/GraphModel'

export type GraphInputValue = number | string | boolean

export interface GraphInputDefinition {
	id: string
	label: string
	valueType: GraphValueType
	defaultValue?: GraphInputValue
	options?: string[]
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
	| (ConfigurationPanelControlBase & { type: 'color' })
	| (ConfigurationPanelControlBase & { type: 'switch' })

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
	| { id: string; type: 'enum'; label: string; value: string; options: string[] }
	| { id: string; type: 'color'; label: string; value: string }
	| { id: string; type: 'boolean'; label: string; value: boolean }

export class GraphDocumentModel {
	private readonly graphs = new Map<string, GraphDefinition>()
	private readonly entryInputValues = new Map<string, GraphInputValue>()
	private configurationControls: ConfigurationPanelControl[]

	public constructor(
		private readonly entryGraphId: string,
		graphs: GraphDefinition[],
		entryInputValues: Record<string, GraphInputValue> = {},
		configurationControls: ConfigurationPanelControl[] = []
	) {
		for (const graph of graphs) {
			if (this.graphs.has(graph.id)) throw new Error(`Duplicate graph ID "${graph.id}"`)
			this.graphs.set(graph.id, graph)
		}
		if (!this.graphs.has(entryGraphId)) throw new Error(`Unknown entry graph "${entryGraphId}"`)
		for (const [inputId, value] of Object.entries(entryInputValues)) {
			const input = this.getEntryGraph().inputs.find((candidate) => candidate.id === inputId)
			if (!input || !isInputValueCompatible(input, value)) {
				throw new Error(`Invalid value for entry input "${inputId}"`)
			}
			this.entryInputValues.set(inputId, value)
		}
		this.configurationControls = configurationControls.map((control) => ({ ...control }))
		this.validateReferences()
	}

	public getEntryGraphId(): string {
		return this.entryGraphId
	}

	public getEntryGraph(): GraphDefinition {
		return this.requireGraph(this.entryGraphId)
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

	public renameGraph(graphId: string, label: string): boolean {
		const graph = this.graphs.get(graphId)
		if (!graph || !label.trim()) return false
		graph.label = label.trim()
		return true
	}

	public removeGraph(graphId: string): boolean {
		if (graphId === this.entryGraphId || !this.graphs.has(graphId)) return false
		this.graphs.delete(graphId)
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
		if (update.defaultValue !== undefined) input.defaultValue = update.defaultValue
		if (update.options !== undefined) input.options = [...update.options]
		if (graphId === this.entryGraphId) {
			const current = this.entryInputValues.get(inputId)
			if (current !== undefined && !isInputValueCompatible(input, current)) {
				if (input.defaultValue !== undefined && isInputValueCompatible(input, input.defaultValue)) {
					this.entryInputValues.set(inputId, input.defaultValue)
				} else {
					this.entryInputValues.delete(inputId)
				}
			}
		}
		return true
	}

	public removeInput(graphId: string, inputId: string): boolean {
		const graph = this.graphs.get(graphId)
		if (!graph) return false
		const index = graph.inputs.findIndex((input) => input.id === inputId)
		if (index < 0) return false
		graph.inputs.splice(index, 1)
		if (graphId === this.entryGraphId) {
			this.entryInputValues.delete(inputId)
			this.configurationControls = this.configurationControls.filter(
				(control) => control.inputId !== inputId
			)
		}
		return true
	}

	public getEntryInputValue(inputId: string): GraphInputValue | undefined {
		const input = this.getEntryGraph().inputs.find((candidate) => candidate.id === inputId)
		if (!input) return undefined
		return this.entryInputValues.get(inputId) ?? input.defaultValue
	}

	public setEntryInputValue(inputId: string, value: GraphInputValue): boolean {
		const input = this.getEntryGraph().inputs.find((candidate) => candidate.id === inputId)
		if (!input || !isInputValueCompatible(input, value)) return false
		this.entryInputValues.set(inputId, value)
		return true
	}

	public getEntryInputValues(): Record<string, GraphInputValue> {
		return Object.fromEntries(this.entryInputValues)
	}

	public getConfigurationControls(): ConfigurationPanelControl[] {
		return this.configurationControls.map((control) => ({ ...control }))
	}

	public setConfigurationControls(controls: ConfigurationPanelControl[]): void {
		const entryInputs = new Map(this.getEntryGraph().inputs.map((input) => [input.id, input]))
		const controlIds = new Set<string>()
		const controlledInputs = new Set<string>()
		this.configurationControls = controls.flatMap((control) => {
			const input = entryInputs.get(control.inputId)
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
			return [{ ...control }]
		})
	}

	private validateReferences(): void {
		const entry = this.getEntryGraph()
		const entryInputIds = new Set(entry.inputs.map((input) => input.id))
		const controlIds = new Set<string>()
		const controlledInputs = new Set<string>()
		for (const control of this.configurationControls) {
			if (!control.id || !control.inputId || typeof control.label !== 'string') {
				throw new Error('Invalid configuration control')
			}
			if (!entryInputIds.has(control.inputId)) {
				throw new Error(
					`Configuration control "${control.id}" references unknown entry input "${control.inputId}"`
				)
			}
			const input = entry.inputs.find((candidate) => candidate.id === control.inputId)
			if (input?.valueType === 'geometry') {
				throw new Error(`Geometry input "${control.inputId}" cannot be shown in configuration`)
			}
			if (input && !isControlCompatible(input, control)) {
				throw new Error(
					`Configuration control "${control.id}" of type "${control.type}" is incompatible with `
					+ `entry input "${control.inputId}" of type "${input.valueType}"`
				)
			}
			if (controlIds.has(control.id)) {
				throw new Error(`Duplicate configuration control ID "${control.id}"`)
			}
			if (controlledInputs.has(control.inputId)) {
				throw new Error(`Entry input "${control.inputId}" has multiple configuration controls`)
			}
			controlIds.add(control.id)
			controlledInputs.add(control.inputId)
		}
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
	return false
}

function copyGraphInput(input: GraphInputDefinition): GraphInputDefinition {
	return {
		...input,
		options: input.options ? [...input.options] : undefined,
	}
}

export function isInputValueCompatible(
	input: GraphInputDefinition,
	value: GraphInputValue
): boolean {
	if (input.valueType === 'number') return typeof value === 'number' && Number.isFinite(value)
	if (input.valueType === 'enum') {
		return typeof value === 'string' && Boolean(input.options?.includes(value))
	}
	if (input.valueType === 'color') return typeof value === 'string'
	if (input.valueType === 'boolean') return typeof value === 'boolean'
	return false
}
