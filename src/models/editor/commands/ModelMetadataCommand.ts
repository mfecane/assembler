import type { EditorCommand } from '@/parametric/editor/commands/EditorCommand'
import type { ModelProject, ModelProjectCheckpoint } from '@/models/editor/ModelProject'

export class ModelMetadataCommand implements EditorCommand {
	public constructor(
		public readonly label: string,
		private readonly project: ModelProject,
		private readonly before: ModelProjectCheckpoint,
		private after: ModelProjectCheckpoint,
		public readonly mergeKey?: string
	) {}

	public execute(): boolean {
		if (this.after.metadata === this.before.metadata) return false
		this.project.restore(this.after)
		return true
	}

	public undo(): void {
		this.project.restore(this.before)
	}

	public redo(): void {
		this.project.restore(this.after)
	}

	public merge(next: EditorCommand): boolean {
		if (!(next instanceof ModelMetadataCommand) || !this.mergeKey || next.mergeKey !== this.mergeKey) {
			return false
		}
		this.after = next.after
		return true
	}
}
