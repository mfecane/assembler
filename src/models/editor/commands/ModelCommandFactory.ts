import type { ModelProject } from '@/models/editor/ModelProject'
import { ModelMetadataCommand } from '@/models/editor/commands/ModelMetadataCommand'

export class ModelCommandFactory {
	public constructor(private readonly project: ModelProject) {}

	public updateMetadata(
		label: string,
		mutation: (metadata: Record<string, unknown>) => Record<string, unknown>,
		mergeKey?: string
	): ModelMetadataCommand {
		const before = this.project.createCheckpoint()
		const metadata = mutation(before.metadata)
		const after = {
			metadata,
			documentVersion: before.documentVersion + 1,
		}
		return new ModelMetadataCommand(label, this.project, before, after, mergeKey)
	}
}
