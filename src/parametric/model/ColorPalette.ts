export interface PresetColor {
	label: string
	value: string
}

export const presetColors: readonly PresetColor[] = [
	{ label: 'Sand', value: '#eaceac' },
	{ label: 'White', value: '#f4f4f5' },
	{ label: 'Charcoal', value: '#27272a' },
	{ label: 'Red', value: '#dc5a5a' },
	{ label: 'Orange', value: '#e8913a' },
	{ label: 'Yellow', value: '#e3c84f' },
	{ label: 'Green', value: '#55a86d' },
	{ label: 'Blue', value: '#528bd1' },
	{ label: 'Purple', value: '#9067c6' },
]

export const defaultMaterialColor = presetColors[0].value
export const presetColorValues = presetColors.map((color) => color.value)

const rgbColorPattern = /^#[0-9a-f]{6}$/i

export function isRgbColor(value: string): boolean {
	return rgbColorPattern.test(value)
}

export function normalizeRgbColor(color: string): string {
	const normalized = color.trim().toLowerCase()
	return isRgbColor(normalized) ? normalized : defaultMaterialColor
}

export function getColorLabel(color: string): string {
	return presetColors.find((preset) => preset.value === color.toLowerCase())?.label
		?? color.toUpperCase()
}
