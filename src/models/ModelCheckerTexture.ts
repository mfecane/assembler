export const DEFAULT_CHECKER_TEXTURE_SCALE = 1
export const MIN_CHECKER_TEXTURE_SCALE = 1
export const MAX_CHECKER_TEXTURE_SCALE = 16

export function validateCheckerTextureScale(scale: number): void {
	if (!Number.isInteger(scale) || scale < MIN_CHECKER_TEXTURE_SCALE || scale > MAX_CHECKER_TEXTURE_SCALE) {
		throw new Error(
			`Checker texture scale must be an integer from ${MIN_CHECKER_TEXTURE_SCALE} to `
			+ `${MAX_CHECKER_TEXTURE_SCALE}. Received ${scale}.`
		)
	}
}
