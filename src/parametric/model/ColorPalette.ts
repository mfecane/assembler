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

export function normalizePresetColor(color: string): string {
	return presetColors.some((preset) => preset.value === color)
		? color
		: defaultMaterialColor
}
