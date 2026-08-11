import type {
	ConfigurationPanelControl,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export class RootGraph {
	private readonly inputValues = new Map<string, GraphInputValue>()
	private configurationControls: ConfigurationPanelControl[]

	public constructor(
		private readonly graphId: string,
		inputValues: Record<string, GraphInputValue>,
		configurationControls: ConfigurationPanelControl[]
	) {
		if (!graphId.trim()) throw new Error('Root graph ID cannot be empty')
		for (const [inputId, value] of Object.entries(inputValues)) {
			this.inputValues.set(inputId, copyInputValue(value))
		}
		this.configurationControls = configurationControls.map(copyConfigurationControl)
	}

	public getGraphId(): string {
		return this.graphId
	}

	public getInputValue(inputId: string): GraphInputValue | undefined {
		const value = this.inputValues.get(inputId)
		return value === undefined ? undefined : copyInputValue(value)
	}

	public setInputValue(inputId: string, value: GraphInputValue): void {
		this.inputValues.set(inputId, copyInputValue(value))
	}

	public removeInputValue(inputId: string): void {
		this.inputValues.delete(inputId)
	}

	public getInputValues(): Record<string, GraphInputValue> {
		return Object.fromEntries(
			[...this.inputValues].map(([inputId, value]) => [inputId, copyInputValue(value)])
		)
	}

	public getConfigurationControls(): ConfigurationPanelControl[] {
		return this.configurationControls.map(copyConfigurationControl)
	}

	public setConfigurationControls(controls: ConfigurationPanelControl[]): void {
		this.configurationControls = controls.map(copyConfigurationControl)
	}
}

function copyConfigurationControl(
	control: ConfigurationPanelControl
): ConfigurationPanelControl {
	if (control.type === 'color') return { ...control, options: [...control.options] }
	if (control.type === 'numberArray') return { ...control, labels: [...control.labels] }
	return { ...control }
}

function copyInputValue(value: GraphInputValue): GraphInputValue {
	return Array.isArray(value) ? [...value] : value
}
