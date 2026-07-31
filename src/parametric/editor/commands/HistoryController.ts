import type { EditorCommand } from '@/parametric/editor/commands/EditorCommand'

const MERGE_WINDOW_MS = 750

export class HistoryController {
	private readonly undoStack: EditorCommand[] = []
	private readonly redoStack: EditorCommand[] = []
	private lastExecutionAt = 0

	public execute(command: EditorCommand): boolean {
		if (!command.execute()) return false
		const previous = this.undoStack[this.undoStack.length - 1]
		const now = Date.now()
		const withinMergeWindow = now - this.lastExecutionAt <= MERGE_WINDOW_MS
		if (!withinMergeWindow || !previous?.merge?.(command)) this.undoStack.push(command)
		this.lastExecutionAt = now
		this.redoStack.length = 0
		return true
	}

	public undo(): boolean {
		const command = this.undoStack.pop()
		if (!command) return false
		command.undo()
		this.redoStack.push(command)
		this.lastExecutionAt = 0
		return true
	}

	public redo(): boolean {
		const command = this.redoStack.pop()
		if (!command) return false
		command.redo()
		this.undoStack.push(command)
		this.lastExecutionAt = 0
		return true
	}

	public canUndo(): boolean {
		return this.undoStack.length > 0
	}

	public canRedo(): boolean {
		return this.redoStack.length > 0
	}
}
