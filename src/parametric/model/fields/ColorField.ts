import { normalizeRgbColor } from '@/parametric/model/ColorPalette'
import type { NodeField } from '@/parametric/model/fields/NodeField'

export class ColorField implements NodeField<string> {
	private value: string

	public constructor(value: string) {
		this.value = normalizeRgbColor(value)
	}

	public get(): string { return this.value }
	public set(value: string): void { this.value = normalizeRgbColor(value) }
	public serialize(): string { return this.value }
}
