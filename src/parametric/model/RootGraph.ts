import {
	createConfigurationConstraint,
	type ConfigurationConstraintDefinition,
	type SumMaximumByEnumConstraint,
} from '@/parametric/model/ConfigurationConstraint'
import type {
	ConfigurationPanelControl,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export class RootGraph {
	private readonly inputValues = new Map<string, GraphInputValue>()
	private configurationControls: ConfigurationPanelControl[]
	private configurationConstraints: SumMaximumByEnumConstraint[]

	public constructor(
		private readonly graphId: string,
		inputValues: Record<string, GraphInputValue>,
		configurationControls: ConfigurationPanelControl[],
		configurationConstraints: ConfigurationConstraintDefinition[]
	) {
		if (!graphId.trim()) throw new Error('Root graph ID cannot be empty')
		for (const [inputId, value] of Object.entries(inputValues)) {
			this.inputValues.set(inputId, value)
		}
		this.configurationControls = configurationControls.map(copyConfigurationControl)
		this.configurationConstraints = configurationConstraints.map(createConfigurationConstraint)
	}

	public getGraphId(): string {
		return this.graphId
	}

	public getInputValue(inputId: string): GraphInputValue | undefined {
		return this.inputValues.get(inputId)
	}

	public setInputValue(inputId: string, value: GraphInputValue): void {
		this.inputValues.set(inputId, value)
	}

	public removeInputValue(inputId: string): void {
		this.inputValues.delete(inputId)
	}

	public getInputValues(): Record<string, GraphInputValue> {
		return Object.fromEntries(this.inputValues)
	}

	public getConfigurationControls(): ConfigurationPanelControl[] {
		return this.configurationControls.map(copyConfigurationControl)
	}

	public setConfigurationControls(controls: ConfigurationPanelControl[]): void {
		this.configurationControls = controls.map(copyConfigurationControl)
	}

	public getConfigurationConstraints(): SumMaximumByEnumConstraint[] {
		return [...this.configurationConstraints]
	}

	public setConfigurationConstraints(constraints: SumMaximumByEnumConstraint[]): void {
		this.configurationConstraints = [...constraints]
	}
}

function copyConfigurationControl(
	control: ConfigurationPanelControl
): ConfigurationPanelControl {
	return control.type === 'color'
		? { ...control, options: [...control.options] }
		: { ...control }
}
