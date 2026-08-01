import type { NodeField } from '@/parametric/model/fields/NodeField'

export class NumberField implements NodeField<number> {
	public constructor(
		private value: number,
		private readonly normalize: (value: number) => number = (value) =>
			Number.isFinite(value) ? value : 0
	) {
		this.value = this.normalize(value)
	}

	public get(): number { return this.value }
	public set(value: number): void { this.value = this.normalize(value) }
	public serialize(): number { return this.value }
}
