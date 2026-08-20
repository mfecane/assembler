export async function seedModelMetadata(admin, seedData) {
	if (seedData.modelMetadata.length === 0) return

	const { error } = await admin
		.from('model_metadata')
		.upsert(seedData.modelMetadata, { onConflict: 'model_id' })
	if (error) {
		throw new Error(
			`Failed to seed optional metadata for ${seedData.modelMetadata.length} registered models: ${error.message}`,
			{ cause: error }
		)
	}
}
