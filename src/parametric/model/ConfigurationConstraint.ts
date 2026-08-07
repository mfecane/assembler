import type {
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export interface SumMaximumByEnumConstraintDefinition {
	type: 'sumMaximumByEnum'
	inputIds: string[]
	selectorInputId: string
	maximums: Record<string, number>
}

export type ConfigurationConstraintDefinition = SumMaximumByEnumConstraintDefinition

export interface ConfigurationConstraintState {
	effectiveMaximum: number
	maximum: number
	selectorValue: string
	total: number
}

export class SumMaximumByEnumConstraint {
	private readonly inputIds: string[]
	private readonly maximums: Record<string, number>

	public constructor(private readonly definition: SumMaximumByEnumConstraintDefinition) {
		this.inputIds = [...definition.inputIds]
		this.maximums = { ...definition.maximums }
	}

	public validate(inputs: GraphInputDefinition[]): void {
		if (this.inputIds.length < 2 || new Set(this.inputIds).size !== this.inputIds.length) {
			throw new Error(
				'Sum-maximum configuration constraint requires at least two unique numeric input IDs. '
				+ `Received ${JSON.stringify(this.inputIds)}.`
			)
		}

		for (const inputId of this.inputIds) {
			const input = inputs.find((candidate) => candidate.id === inputId)
			if (input?.valueType !== 'number') {
				throw new Error(
					`Sum-maximum configuration constraint input "${inputId}" must reference a numeric `
					+ 'entry input.'
				)
			}
		}

		const selector = inputs.find((input) => input.id === this.definition.selectorInputId)
		if (selector?.valueType !== 'enum') {
			throw new Error(
				`Sum-maximum configuration constraint selector "${this.definition.selectorInputId}" `
				+ 'must reference an enum entry input.'
			)
		}

		const options = selector.options ?? []
		const maximumOptions = Object.keys(this.maximums)
		const missingOptions = options.filter((option) => !(option in this.maximums))
		const unknownOptions = maximumOptions.filter((option) => !options.includes(option))
		const invalidMaximums = Object.entries(this.maximums).filter(
			([, maximum]) => !Number.isFinite(maximum) || maximum < 0
		)
		if (missingOptions.length > 0 || unknownOptions.length > 0 || invalidMaximums.length > 0) {
			throw new Error(
				`Sum-maximum configuration constraint for selector "${selector.id}" must define one `
				+ `non-negative finite maximum for every enum option. Missing options: `
				+ `${JSON.stringify(missingOptions)}. Unknown options: ${JSON.stringify(unknownOptions)}. `
				+ `Invalid maximums: ${JSON.stringify(invalidMaximums)}.`
			)
		}
	}

	public assertSatisfied(values: Record<string, GraphInputValue>): void {
		const firstInputId = this.inputIds[0]
		if (!firstInputId) throw new Error('Sum-maximum configuration constraint has no inputs.')
		const state = this.getState(firstInputId, values)
		if (state.total <= state.maximum) return
		throw new Error(
			`Configuration values exceed the total maximum for selector `
			+ `"${this.definition.selectorInputId}" value "${state.selectorValue}": inputs `
			+ `${JSON.stringify(this.inputIds)} total ${state.total}, maximum ${state.maximum}.`
		)
	}

	public getState(
		inputId: string,
		values: Record<string, GraphInputValue>
	): ConfigurationConstraintState {
		if (!this.inputIds.includes(inputId)) {
			throw new Error(
				`Input "${inputId}" is not part of sum-maximum configuration constraint `
				+ `${JSON.stringify(this.inputIds)}.`
			)
		}
		const selectorValue = this.getSelectorValue(values)
		const maximum = this.getMaximum(selectorValue)
		const total = this.inputIds.reduce(
			(sum, candidateId) => sum + this.getNumericValue(candidateId, values),
			0
		)
		const otherTotal = total - this.getNumericValue(inputId, values)
		return {
			effectiveMaximum: Math.max(0, maximum - otherTotal),
			maximum,
			selectorValue,
			total,
		}
	}

	public reconcile(
		values: Record<string, GraphInputValue>,
		changedInputId: string
	): Record<string, number> {
		if (changedInputId === this.definition.selectorInputId) {
			return this.reconcileByPriority(values)
		}
		if (!this.inputIds.includes(changedInputId)) return {}

		const state = this.getState(changedInputId, values)
		if (state.total <= state.maximum) return {}
		return { [changedInputId]: state.effectiveMaximum }
	}

	public referencesInput(inputId: string): boolean {
		return inputId === this.definition.selectorInputId || this.inputIds.includes(inputId)
	}

	public getConstrainedInputIds(): string[] {
		return [...this.inputIds]
	}

	public getSelectorInputId(): string {
		return this.definition.selectorInputId
	}

	public toDefinition(): SumMaximumByEnumConstraintDefinition {
		return {
			type: 'sumMaximumByEnum',
			inputIds: [...this.inputIds],
			selectorInputId: this.definition.selectorInputId,
			maximums: { ...this.maximums },
		}
	}

	private reconcileByPriority(
		values: Record<string, GraphInputValue>
	): Record<string, number> {
		let remaining = this.getMaximum(this.getSelectorValue(values))
		const updates: Record<string, number> = {}
		for (const inputId of this.inputIds) {
			const value = this.getNumericValue(inputId, values)
			const reconciledValue = Math.min(value, Math.max(0, remaining))
			if (reconciledValue !== value) updates[inputId] = reconciledValue
			remaining -= reconciledValue
		}
		return updates
	}

	private getSelectorValue(values: Record<string, GraphInputValue>): string {
		const value = values[this.definition.selectorInputId]
		if (typeof value !== 'string') {
			throw new Error(
				`Sum-maximum configuration constraint selector "${this.definition.selectorInputId}" `
				+ `requires a string value. Received ${JSON.stringify(value)}.`
			)
		}
		return value
	}

	private getMaximum(selectorValue: string): number {
		const maximum = this.maximums[selectorValue]
		if (maximum === undefined) {
			throw new Error(
				`Sum-maximum configuration constraint selector "${this.definition.selectorInputId}" `
				+ `has no maximum for value "${selectorValue}".`
			)
		}
		return maximum
	}

	private getNumericValue(
		inputId: string,
		values: Record<string, GraphInputValue>
	): number {
		const value = values[inputId]
		if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
			throw new Error(
				`Sum-maximum configuration constraint input "${inputId}" requires a non-negative `
				+ `finite numeric `
				+ `value. Received ${JSON.stringify(value)}.`
			)
		}
		return value
	}
}

export function createConfigurationConstraint(
	definition: ConfigurationConstraintDefinition
): SumMaximumByEnumConstraint {
	if (definition.type === 'sumMaximumByEnum') {
		return new SumMaximumByEnumConstraint(definition)
	}
	throw new Error(`Unknown configuration constraint type: ${JSON.stringify(definition)}`)
}
