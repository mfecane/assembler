import { getSupabaseClient } from '@/lib/supabase'
import { ModelMetadataRecord } from '@/models/ModelCatalogItem'

interface ModelMetadataRow {
	model_id: string
	metadata: unknown
	updated_at: string
}

export class ModelMetadataRepository {
	private readonly supabase = getSupabaseClient()

	public async getMetadata(modelId: string): Promise<ModelMetadataRecord | null> {
		const { data, error } = await this.supabase
			.from('model_metadata')
			.select('model_id, metadata, updated_at')
			.eq('model_id', modelId)
			.maybeSingle()
		if (error) {
			throw new Error(
				`Failed to load metadata for registered model "${modelId}": ${JSON.stringify(error)}`
			)
		}
		return data ? toMetadata(data as ModelMetadataRow) : null
	}

	public async listMetadata(modelIds: readonly string[]): Promise<ModelMetadataRecord[]> {
		if (modelIds.length === 0) return []
		const { data, error } = await this.supabase
			.from('model_metadata')
			.select('model_id, metadata, updated_at')
			.in('model_id', modelIds)
		if (error) {
			throw new Error(
				`Failed to load metadata for registered models ${JSON.stringify(modelIds)}: ${JSON.stringify(error)}`
			)
		}
		return (data as ModelMetadataRow[]).map(toMetadata)
	}

	public async saveMetadata(
		modelId: string,
		metadata: Record<string, unknown>
	): Promise<ModelMetadataRecord> {
		const { data, error } = await this.supabase
			.from('model_metadata')
			.upsert({ model_id: modelId, metadata }, { onConflict: 'model_id' })
			.select('model_id, metadata, updated_at')
			.single()
		if (error) {
			throw new Error(
				`Failed to create or update metadata for registered model "${modelId}" with value `
				+ `${JSON.stringify(metadata)}: ${JSON.stringify(error)}`
			)
		}
		return toMetadata(data as ModelMetadataRow)
	}
}

function toMetadata(row: ModelMetadataRow): ModelMetadataRecord {
	if (!row.metadata || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) {
		throw new Error(
			`Metadata record for model "${row.model_id}" must contain a JSON object. `
			+ `Received ${JSON.stringify(row.metadata)}.`
		)
	}
	return new ModelMetadataRecord(
		row.model_id,
		row.metadata as Record<string, unknown>,
		row.updated_at
	)
}
