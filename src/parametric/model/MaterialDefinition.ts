export class MaterialDefinition {
	public constructor(
		public readonly id: string,
		public readonly label: string,
		public readonly textureUrl: string | null,
		public readonly roughness: number,
		public readonly metalness: number
	) {
		if (!id.trim()) throw new Error('Material ID cannot be empty')
		if (!label.trim()) throw new Error(`Material "${id}" requires a label`)
		if (textureUrl !== null && !textureUrl.trim()) {
			throw new Error(`Material "${id}" texture URL must be non-empty when provided`)
		}
		if (!Number.isFinite(roughness) || roughness < 0 || roughness > 1) {
			throw new Error(`Material "${id}" roughness must be a finite value from 0 to 1`)
		}
		if (!Number.isFinite(metalness) || metalness < 0 || metalness > 1) {
			throw new Error(`Material "${id}" metalness must be a finite value from 0 to 1`)
		}
	}
}
