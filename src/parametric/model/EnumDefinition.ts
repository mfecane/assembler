import { EnumField } from '@/parametric/model/fields/EnumField'

export interface EnumDefinitionSnapshot {
	id: string
	name: string
	options: string[]
}

export class EnumDefinition {
	private name: string
	private readonly field: EnumField

	public constructor(
		public readonly id: string,
		name: string,
		options: readonly string[]
	) {
		this.name = name.trim()
		this.field = new EnumField(options[0] ?? '', options)
	}

	public getName(): string {
		return this.name
	}

	public setName(name: string): void {
		const normalizedName = name.trim()
		if (!normalizedName) {
			throw new Error(`Cannot rename choice set "${this.id}": the name cannot be empty.`)
		}
		this.name = normalizedName
	}

	public getOptions(): string[] {
		return this.field.getOptions()
	}

	public addOption(option: string): void {
		const normalizedOption = option.trim()
		if (!normalizedOption) {
			throw new Error(`Cannot add an empty choice to choice set "${this.id}".`)
		}
		if (this.field.getOptions().includes(normalizedOption)) {
			throw new Error(
				`Cannot add duplicate choice ${JSON.stringify(normalizedOption)} to choice set "${this.id}".`
			)
		}
		this.field.setOptions([...this.field.getOptions(), normalizedOption])
	}

	public renameOption(index: number, option: string): string {
		const options = this.field.getOptions()
		const previousOption = options[index]
		if (previousOption === undefined) {
			throw new Error(
				`Cannot rename choice ${index + 1} in choice set "${this.id}": it does not exist.`
			)
		}
		const normalizedOption = option.trim()
		if (!normalizedOption) {
			throw new Error(`Cannot rename choice ${index + 1} in choice set "${this.id}" to an empty value.`)
		}
		if (options.some((candidate, candidateIndex) => (
			candidateIndex !== index && candidate === normalizedOption
		))) {
			throw new Error(
				`Cannot rename choice ${JSON.stringify(previousOption)} in choice set "${this.id}" to `
				+ `${JSON.stringify(normalizedOption)} because that option already exists.`
			)
		}
		this.field.setOptions(options.map((candidate, candidateIndex) => (
			candidateIndex === index ? normalizedOption : candidate
		)))
		return previousOption
	}

	public moveOption(sourceIndex: number, targetIndex: number): void {
		const options = this.field.getOptions()
		if (
			!Number.isInteger(sourceIndex)
			|| !Number.isInteger(targetIndex)
			|| sourceIndex < 0
			|| sourceIndex >= options.length
			|| targetIndex < 0
			|| targetIndex >= options.length
		) {
			throw new Error(
				`Cannot reorder choice set "${this.id}" with source index ${sourceIndex} and target index `
				+ `${targetIndex}; valid indices are 0 through ${options.length - 1}.`
			)
		}
		if (sourceIndex === targetIndex) return
		const [moved] = options.splice(sourceIndex, 1)
		options.splice(targetIndex, 0, moved)
		this.field.setOptions(options)
	}

	public removeOption(index: number): string {
		const options = this.field.getOptions()
		if (options.length <= 1) {
			throw new Error(`Cannot remove the last choice from choice set "${this.id}".`)
		}
		const removedOption = options[index]
		if (removedOption === undefined) {
			throw new Error(
				`Cannot remove choice ${index + 1} from choice set "${this.id}": it does not exist.`
			)
		}
		this.field.setOptions(options.filter((_, candidateIndex) => candidateIndex !== index))
		return removedOption
	}

	public toSnapshot(): EnumDefinitionSnapshot {
		return {
			id: this.id,
			name: this.name,
			options: this.field.getOptions(),
		}
	}
}
