import type {
	GraphState,
	GraphStateCheckpoint,
} from '@/parametric/editor/GraphState'
import type { EditorCommand } from '@/parametric/editor/commands/EditorCommand'

export class GraphStateCommand implements EditorCommand {
	private before: GraphStateCheckpoint | null = null
	private after: GraphStateCheckpoint | null = null

	public constructor(
		public readonly label: string,
		private readonly state: GraphState,
		private readonly mutation: () => void,
		public readonly mergeKey?: string
	) {}

	public execute(): boolean {
		this.before = this.state.capture()
		try {
			this.mutation()
			const document = this.state.serialize()
			if (JSON.stringify(document) === JSON.stringify(this.before.document)) {
				this.state.restore(this.before)
				return false
			}
			this.state.createDocumentVersion()
			this.after = this.state.capture()
			return true
		} catch (cause) {
			this.state.restore(this.before)
			throw cause
		}
	}

	public undo(): void {
		if (!this.before) throw new Error(`Command "${this.label}" has not been executed`)
		this.state.restore(this.before)
	}

	public redo(): void {
		if (!this.after) throw new Error(`Command "${this.label}" has not been executed`)
		this.state.restore(this.after)
	}

	public merge(next: EditorCommand): boolean {
		if (
			!this.mergeKey
			|| next.mergeKey !== this.mergeKey
			|| !(next instanceof GraphStateCommand)
			|| !next.after
		) {
			return false
		}
		this.after = next.after
		return true
	}
}
