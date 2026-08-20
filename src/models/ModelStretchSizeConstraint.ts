import { ModelStretchAxis } from '@/models/ModelStretchMetadata'

const MAX_STRETCH_SIZE_MULTIPLIER = 10
const SIZE_PRECISION = 6

export class ModelStretchSizeConstraint {
	public constructor(
		public readonly min: number,
		public readonly max: number
	) {
		if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || min > max) {
			throw new Error(`Invalid stretch size constraint: min ${min}, max ${max}.`)
		}
	}

	public constrain(value: number): number {
		return round(Math.min(this.max, Math.max(this.min, value)))
	}
}

export function createModelStretchSizeConstraint(
	modelSize: number,
	stretchAxis: ModelStretchAxis
): ModelStretchSizeConstraint {
	if (!Number.isFinite(modelSize) || modelSize <= 0) {
		throw new Error(
			`Cannot create ${stretchAxis.axis.toUpperCase()} stretch size constraint from model size ${modelSize}.`
		)
	}
	const minimumGap = Math.max(modelSize / 1_000, 0.000001)
	const fixedSize = modelSize - stretchAxis.getTotalStretchLength()
	const min = round(Math.max(fixedSize + minimumGap, minimumGap))
	const max = round(Math.max(modelSize * MAX_STRETCH_SIZE_MULTIPLIER, min))
	return new ModelStretchSizeConstraint(min, max)
}

function round(value: number): number {
	return Number(value.toFixed(SIZE_PRECISION))
}
