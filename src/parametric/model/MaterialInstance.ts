export class MaterialInstance {
	public constructor(public readonly materialId: string, public readonly color?: string) {
		if (!materialId.trim()) throw new Error('Material instance requires a material ID')
		if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
			throw new Error(`Material instance color must be a six-digit hexadecimal value. Received ${JSON.stringify(color)}.`)
		}
	}
}
