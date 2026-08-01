export interface NodeField<T> {
	get(): T
	set(value: T): void
	serialize(): T
}
