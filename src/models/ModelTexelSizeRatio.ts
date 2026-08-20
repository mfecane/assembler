export const DEFAULT_MODEL_TEXEL_SIZE_RATIO = 1
export const MIN_MODEL_TEXEL_SIZE_RATIO = 0.01
export const MAX_MODEL_TEXEL_SIZE_RATIO = 10
export const MODEL_TEXEL_SIZE_RATIO_STEP = 0.01

export function readModelTexelSizeRatio(metadata: Record<string, unknown>): number {
	const value = metadata.texelSizeRatio
	if (value === undefined) return DEFAULT_MODEL_TEXEL_SIZE_RATIO
	validateModelTexelSizeRatio(value)
	return value
}

export function withModelTexelSizeRatio(
	metadata: Record<string, unknown>,
	texelSizeRatio: number
): Record<string, unknown> {
	validateModelTexelSizeRatio(texelSizeRatio)
	return { ...metadata, texelSizeRatio: round(texelSizeRatio) }
}

export function validateModelTexelSizeRatio(value: unknown): asserts value is number {
	if (
		typeof value !== 'number'
		|| !Number.isFinite(value)
		|| value < MIN_MODEL_TEXEL_SIZE_RATIO
		|| value > MAX_MODEL_TEXEL_SIZE_RATIO
	) {
		throw new Error(
			`Model metadata "texelSizeRatio" must be a finite number from `
			+ `${MIN_MODEL_TEXEL_SIZE_RATIO} to ${MAX_MODEL_TEXEL_SIZE_RATIO}, representing UV units per `
			+ `model-space unit. Received ${describe(value)}.`
		)
	}
}

function describe(value: unknown): string {
	return JSON.stringify(value) ?? String(value)
}

function round(value: number): number {
	return Number(value.toFixed(6))
}
