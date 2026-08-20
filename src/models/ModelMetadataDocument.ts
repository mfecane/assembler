import {
	ASSET_METADATA_FORMAT,
	ASSET_METADATA_FORMAT_VERSION,
	type Client,
} from '@/cosntants'
import type { ModelCatalogItem, ModelMetadataRecord } from '@/models/ModelCatalogItem'

export function createModelMetadataDocument(
	client: Client,
	models: readonly ModelCatalogItem[],
	metadataRecords: readonly ModelMetadataRecord[]
): Record<string, unknown> {
	const metadataByModelId = new Map(metadataRecords.map((record) => [record.modelId, record.metadata]))
	const unknownRecords = metadataRecords.filter((record) => !models.some((model) => model.id === record.modelId))
	if (unknownRecords.length > 0) {
		throw new Error(
			`Cannot export metadata for client "${client}" because records reference models outside its catalog. `
			+ `Unexpected model IDs: ${JSON.stringify(unknownRecords.map((record) => record.modelId))}.`
		)
	}

	return {
		format: ASSET_METADATA_FORMAT,
		version: ASSET_METADATA_FORMAT_VERSION,
		units: 'scene-units',
		assetCount: models.length,
		assets: models.map((model) => ({
			id: model.id,
			label: model.name,
			...(metadataByModelId.get(model.id) ?? {}),
		})),
	}
}
