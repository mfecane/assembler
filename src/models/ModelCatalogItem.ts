import type { Client } from '@/constants'

export class ModelCatalogItem {
	public constructor(
		public readonly id: string,
		public readonly clientId: Client,
		public readonly name: string
	) {}
}

export class ModelMetadataRecord {
	public constructor(
		public readonly modelId: string,
		public readonly metadata: Record<string, unknown>,
		public readonly updatedAt: string
	) {}
}
