import type { ModelBoundingBoxMetadata } from '@/models/ModelBoundsMetadata'

export type ModelGeometryAxis = 'x' | 'y' | 'z'
export type ModelTextureAxis = 'u' | 'v'
export type StretchBoundary = 'min' | 'max'

const MAX_STRETCH_AXES = 3
const DEFAULT_MIN_FRACTION = 0.05
const DEFAULT_MAX_FRACTION = 0.95

export function readModelStretchEnabled(metadata: Record<string, unknown>): boolean {
	const value = metadata.stretchEnabled
	if (value === undefined) return false
	if (typeof value !== 'boolean') {
		throw new Error(`Model metadata "stretchEnabled" must be a boolean. Received ${describe(value)}.`)
	}
	return value
}

export function withModelStretchEnabled(
	metadata: Record<string, unknown>,
	enabled: boolean
): Record<string, unknown> {
	return { ...metadata, stretchEnabled: enabled }
}

export class ModelStretchBox {
	public constructor(
		public readonly min: number,
		public readonly max: number
	) {
		if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
			throw new Error(
				`Invalid stretch box: min (${min}) must be a finite number below max (${max}).`
			)
		}
	}

	public withBoundary(boundary: StretchBoundary, value: number): ModelStretchBox {
		return new ModelStretchBox(
			boundary === 'min' ? value : this.min,
			boundary === 'max' ? value : this.max
		)
	}

	public toJSON(): Record<string, number> {
		return { min: this.min, max: this.max }
	}
}

export class ModelStretchAxis {
	public readonly boxes: readonly ModelStretchBox[]

	public constructor(
		public readonly axis: ModelGeometryAxis,
		boxes: readonly ModelStretchBox[],
		public readonly textureAxis: ModelTextureAxis | null
	) {
		if (boxes.length === 0) {
			throw new Error(`Invalid ${axis.toUpperCase()} stretch axis: at least one stretch box is required.`)
		}
		this.boxes = [...boxes].sort((left, right) => left.min - right.min)
		for (let index = 1; index < this.boxes.length; index += 1) {
			const previous = this.boxes[index - 1]
			const current = this.boxes[index]
			if (previous.max > current.min) {
				throw new Error(
					`Invalid ${axis.toUpperCase()} stretch boxes: box ${index - 1} (${previous.min}–${previous.max}) `
					+ `intersects box ${index} (${current.min}–${current.max}).`
				)
			}
		}
	}

	public withBox(boxIndex: number, box: ModelStretchBox): ModelStretchAxis {
		this.requireBox(boxIndex)
		return new ModelStretchAxis(
			this.axis,
			this.boxes.map((current, index) => index === boxIndex ? box : current),
			this.textureAxis
		)
	}

	public withBoundary(boxIndex: number, boundary: StretchBoundary, value: number): ModelStretchAxis {
		return this.withBox(boxIndex, this.requireBox(boxIndex).withBoundary(boundary, value))
	}

	public withAddedBox(box: ModelStretchBox): ModelStretchAxis {
		return new ModelStretchAxis(this.axis, [...this.boxes, box], this.textureAxis)
	}

	public withRemovedBox(boxIndex: number): ModelStretchAxis {
		this.requireBox(boxIndex)
		if (this.boxes.length === 1) {
			throw new Error(
				`Cannot remove the only ${this.axis.toUpperCase()} stretch box; remove the axis instead.`
			)
		}
		return new ModelStretchAxis(
			this.axis,
			this.boxes.filter((_, index) => index !== boxIndex),
			this.textureAxis
		)
	}

	public withTextureAxis(textureAxis: ModelTextureAxis | null): ModelStretchAxis {
		return new ModelStretchAxis(this.axis, this.boxes, textureAxis)
	}

	public getTotalStretchLength(): number {
		return this.boxes.reduce((total, box) => total + box.max - box.min, 0)
	}

	public toJSON(): Record<string, unknown> {
		return {
			axis: this.axis,
			boxes: this.boxes.map((box) => box.toJSON()),
			textureAxis: this.textureAxis,
		}
	}

	private requireBox(boxIndex: number): ModelStretchBox {
		const box = this.boxes[boxIndex]
		if (!box) {
			throw new Error(
				`Cannot access ${this.axis.toUpperCase()} stretch box ${boxIndex}; `
				+ `the axis contains ${this.boxes.length} box(es).`
			)
		}
		return box
	}
}

export function readModelStretchAxes(metadata: Record<string, unknown>): ModelStretchAxis[] {
	const value = metadata.stretchAxes
	if (value === undefined) return []
	if (!Array.isArray(value)) {
		throw new Error(`Model metadata "stretchAxes" must be an array. Received ${describe(value)}.`)
	}
	const axes = value.map((item, index) => readStretchAxis(item, index))
	validateStretchAxes(axes)
	return axes
}

export function addModelStretchAxis(
	metadata: Record<string, unknown>,
	boundingBox: ModelBoundingBoxMetadata,
	axis: ModelGeometryAxis
): Record<string, unknown> {
	const axes = readModelStretchAxes(metadata)
	if (axes.length >= MAX_STRETCH_AXES) {
		throw new Error(`Cannot add ${axis.toUpperCase()} stretch axis: all three geometry axes are configured.`)
	}
	if (axes.some((item) => item.axis === axis)) {
		throw new Error(`Cannot add ${axis.toUpperCase()} stretch axis because that axis already exists.`)
	}

	const halfSize = boundingBox.size[axis] / 2
	const boundsMin = boundingBox.center[axis] - halfSize
	const size = boundingBox.size[axis]
	return withModelStretchAxes(withModelStretchEnabled(metadata, true), [
		...axes,
		new ModelStretchAxis(axis, [new ModelStretchBox(
			round(boundsMin + size * DEFAULT_MIN_FRACTION),
			round(boundsMin + size * DEFAULT_MAX_FRACTION)
		)], null),
	])
}

export function addModelStretchBox(
	metadata: Record<string, unknown>,
	boundingBox: ModelBoundingBoxMetadata,
	axis: ModelGeometryAxis
): Record<string, unknown> {
	const stretchAxis = requireStretchAxis(metadata, axis, 'add a box')
	const boundsMin = boundingBox.center[axis] - boundingBox.size[axis] / 2
	const boundsMax = boundingBox.center[axis] + boundingBox.size[axis] / 2
	const occupied = stretchAxis.boxes
		.map((box) => ({ min: Math.max(boundsMin, box.min), max: Math.min(boundsMax, box.max) }))
		.filter((box) => box.min < box.max)
		.map((box) => new ModelStretchBox(box.min, box.max))
	const gaps: ModelStretchBox[] = []
	let cursor = boundsMin
	for (const box of occupied) {
		if (cursor < box.min) gaps.push(new ModelStretchBox(cursor, box.min))
		cursor = Math.max(cursor, box.max)
	}
	if (cursor < boundsMax) gaps.push(new ModelStretchBox(cursor, boundsMax))
	const largestGap = gaps.sort((left, right) => (right.max - right.min) - (left.max - left.min))[0]
	const minimumLength = Math.max(boundingBox.size[axis] / 1_000, 0.000001)
	if (!largestGap || largestGap.max - largestGap.min <= minimumLength) {
		throw new Error(
			`Cannot add another ${axis.toUpperCase()} stretch box because the configured boxes leave no `
			+ `non-intersecting space inside source bounds ${boundsMin}–${boundsMax}. Existing boxes: `
			+ stretchAxis.boxes.map((box) => `${box.min}–${box.max}`).join(', ')
		)
	}
	const inset = (largestGap.max - largestGap.min) * 0.1
	return updateModelStretchAxis(
		metadata,
		stretchAxis.withAddedBox(new ModelStretchBox(
			round(largestGap.min + inset),
			round(largestGap.max - inset)
		))
	)
}

export function removeModelStretchBox(
	metadata: Record<string, unknown>,
	axis: ModelGeometryAxis,
	boxIndex: number
): Record<string, unknown> {
	return updateModelStretchAxis(
		metadata,
		requireStretchAxis(metadata, axis, `remove box ${boxIndex}`).withRemovedBox(boxIndex)
	)
}

export function updateModelStretchAxis(
	metadata: Record<string, unknown>,
	updated: ModelStretchAxis
): Record<string, unknown> {
	const axes = readModelStretchAxes(metadata)
	if (!axes.some((item) => item.axis === updated.axis)) {
		throw new Error(`Cannot update missing ${updated.axis.toUpperCase()} stretch axis.`)
	}
	return withModelStretchAxes(
		metadata,
		axes.map((item) => item.axis === updated.axis ? updated : item)
	)
}

export function removeModelStretchAxis(
	metadata: Record<string, unknown>,
	axis: ModelGeometryAxis
): Record<string, unknown> {
	const axes = readModelStretchAxes(metadata)
	if (!axes.some((item) => item.axis === axis)) {
		throw new Error(`Cannot remove missing ${axis.toUpperCase()} stretch axis.`)
	}
	return withModelStretchAxes(metadata, axes.filter((item) => item.axis !== axis))
}

function requireStretchAxis(
	metadata: Record<string, unknown>,
	axis: ModelGeometryAxis,
	action: string
): ModelStretchAxis {
	const stretchAxis = readModelStretchAxes(metadata).find((item) => item.axis === axis)
	if (!stretchAxis) throw new Error(`Cannot ${action} for missing ${axis.toUpperCase()} stretch axis.`)
	return stretchAxis
}

function withModelStretchAxes(
	metadata: Record<string, unknown>,
	axes: ModelStretchAxis[]
): Record<string, unknown> {
	validateStretchAxes(axes)
	if (axes.length === 0) {
		const { stretchAxes: _removed, ...remaining } = metadata
		return remaining
	}
	return { ...metadata, stretchAxes: axes.map((axis) => axis.toJSON()) }
}

function validateStretchAxes(axes: ModelStretchAxis[]): void {
	if (axes.length > MAX_STRETCH_AXES) {
		throw new Error(
			`Model metadata contains ${axes.length} stretch axes; at most ${MAX_STRETCH_AXES} are supported.`
		)
	}
	const uniqueAxes = new Set(axes.map((item) => item.axis))
	if (uniqueAxes.size !== axes.length) {
		throw new Error('Model metadata "stretchAxes" must not contain the same geometry axis twice.')
	}
	for (const textureAxis of ['u', 'v'] satisfies ModelTextureAxis[]) {
		const assignedAxes = axes.filter((item) => item.textureAxis === textureAxis)
		if (assignedAxes.length <= 1) continue
		throw new Error(
			`Model metadata "stretchAxes" assigns texture axis ${textureAxis.toUpperCase()} to `
			+ `${assignedAxes.map((item) => item.axis.toUpperCase()).join(', ')} geometry axes. `
			+ `Each texture axis can be scaled by only one geometry axis.`
		)
	}
}

function readStretchAxis(value: unknown, index: number): ModelStretchAxis {
	if (!isJsonObject(value)) {
		throw new Error(`Model metadata "stretchAxes[${index}]" must be an object. Received ${describe(value)}.`)
	}
	if (!isGeometryAxis(value.axis)) {
		throw new Error(
			`Model metadata "stretchAxes[${index}].axis" must be x, y, or z. Received ${describe(value.axis)}.`
		)
	}
	if (value.textureAxis !== undefined && value.textureAxis !== null && !isTextureAxis(value.textureAxis)) {
		throw new Error(
			`Model metadata "stretchAxes[${index}].textureAxis" must be u, v, or null when present. `
			+ `Received ${describe(value.textureAxis)}.`
		)
	}
	if (!Array.isArray(value.boxes) || value.boxes.length === 0) {
		throw new Error(
			`Model metadata "stretchAxes[${index}].boxes" must be a non-empty array. `
			+ `Received ${describe(value.boxes)}.`
		)
	}
	return new ModelStretchAxis(
		value.axis,
		value.boxes.map((box, boxIndex) => readStretchBox(box, index, boxIndex)),
		value.textureAxis ?? null
	)
}

function readStretchBox(value: unknown, axisIndex: number, boxIndex: number): ModelStretchBox {
	if (!isJsonObject(value) || typeof value.min !== 'number' || typeof value.max !== 'number') {
		throw new Error(
			`Model metadata "stretchAxes[${axisIndex}].boxes[${boxIndex}]" must be an object with numeric `
			+ `min and max. Received ${describe(value)}.`
		)
	}
	return new ModelStretchBox(value.min, value.max)
}

function isGeometryAxis(value: unknown): value is ModelGeometryAxis {
	return value === 'x' || value === 'y' || value === 'z'
}

function isTextureAxis(value: unknown): value is ModelTextureAxis {
	return value === 'u' || value === 'v'
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function describe(value: unknown): string {
	return JSON.stringify(value) ?? String(value)
}

function round(value: number): number {
	return Number(value.toFixed(6))
}
