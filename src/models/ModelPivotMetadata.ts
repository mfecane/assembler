export type ModelPivotEditingMode = 'free' | 'bounds'

export class ModelPivot {
	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number
	) {
		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
			throw new Error(
				`Model pivot coordinates must be finite numbers. Received ${describe({ x, y, z })}.`
			)
		}
	}

	public equals(other: ModelPivot): boolean {
		return this.x === other.x && this.y === other.y && this.z === other.z
	}

	public toJSON(): Record<string, number> {
		return { x: this.x, y: this.y, z: this.z }
	}
}

export function readModelPivot(metadata: Record<string, unknown>): ModelPivot {
	const value = metadata.pivot
	if (value === undefined) return new ModelPivot(0, 0, 0)
	if (!isJsonObject(value)) {
		throw new Error(`Model metadata "pivot" must be an object. Received ${describe(value)}.`)
	}
	return new ModelPivot(
		readOptionalCoordinate(value, 'x'),
		readOptionalCoordinate(value, 'y'),
		readOptionalCoordinate(value, 'z')
	)
}

export function withModelPivot(
	metadata: Record<string, unknown>,
	pivot: ModelPivot
): Record<string, unknown> {
	return { ...metadata, pivot: pivot.toJSON() }
}

function readOptionalCoordinate(
	value: Record<string, unknown>,
	axis: 'x' | 'y' | 'z'
): number {
	const coordinate = value[axis]
	if (coordinate === undefined) return 0
	if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
		throw new Error(
			`Model metadata "pivot.${axis}" must be a finite number when present. `
			+ `Received ${describe(coordinate)} in ${describe(value)}.`
		)
	}
	return coordinate
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function describe(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value)
	} catch {
		return String(value)
	}
}
