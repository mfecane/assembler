import type { NodeField } from '@/parametric/model/fields/NodeField'

export class BooleanField implements NodeField<boolean> {
	public constructor(private value: boolean) {}
	public get(): boolean { return this.value }
	public set(value: boolean): void { this.value = value }
	public serialize(): boolean { return this.value }
}
