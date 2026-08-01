import type { NodeField } from '@/parametric/model/fields/NodeField'

export class EnumField<T extends string = string> implements NodeField<T> {
	private value: T
	private options: T[]

	public constructor(
		value: T,
		options: readonly T[],
		private readonly fallback: T = 'Option' as T
	) {
		this.options = EnumField.normalizeOptions(options, fallback)
		this.value = this.options.includes(value) ? value : this.options[0]
	}

	public get(): T { return this.value }
	public set(value: T): void {
		if (this.options.includes(value)) this.value = value
	}
	public serialize(): T { return this.value }
	public getOptions(): T[] { return [...this.options] }
	public setOptions(options: readonly T[]): void {
		this.options = EnumField.normalizeOptions(options, this.fallback)
		if (!this.options.includes(this.value)) this.value = this.options[0]
	}

	public static normalizeOptions<TValue extends string>(
		options: readonly TValue[],
		fallback: TValue = 'Option' as TValue
	): TValue[] {
		const normalized = [
			...new Set(options.map((option) => option.trim()).filter(Boolean)),
		] as TValue[]
		return normalized.length > 0 ? normalized : [fallback]
	}
}
