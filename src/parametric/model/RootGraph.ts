import type {
	ConfigurationPanelControl,
	ConfigurationTemplate,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import { Vector3Value } from '@/parametric/model/Vector3Value'

export class RootGraph {
	private readonly inputValues = new Map<string, GraphInputValue>()
	private configurationControls: ConfigurationPanelControl[]
	private configurationTemplates: ConfigurationTemplate[]

	public constructor(
		private readonly graphId: string,
		inputValues: Record<string, GraphInputValue>,
		configurationControls: ConfigurationPanelControl[],
		configurationTemplates: ConfigurationTemplate[]
	) {
		if (!graphId.trim()) throw new Error('Root graph ID cannot be empty')
		for (const [inputId, value] of Object.entries(inputValues)) {
			this.inputValues.set(inputId, copyInputValue(value))
		}
		this.configurationControls = configurationControls.map(copyConfigurationControl)
		this.configurationTemplates = configurationTemplates.map(copyConfigurationTemplate)
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

	public getConfigurationTemplates(): ConfigurationTemplate[] {
		return this.configurationTemplates.map(copyConfigurationTemplate)
	}

	public setConfigurationTemplates(templates: ConfigurationTemplate[]): void {
		this.configurationTemplates = templates.map(copyConfigurationTemplate)
	}

}

function copyConfigurationTemplate(template: ConfigurationTemplate): ConfigurationTemplate {
	return {
		...template,
		values: Object.fromEntries(Object.entries(template.values).map(([inputId, value]) => (
			[inputId, copyInputValue(value)]
		))),
	}
}

function copyConfigurationControl(control: ConfigurationPanelControl): ConfigurationPanelControl {
	return { ...control }
}

function copyInputValue(value: GraphInputValue): GraphInputValue {
	if (Array.isArray(value)) return [...value]
	return Vector3Value.isSnapshot(value) ? { ...value } : value
}
