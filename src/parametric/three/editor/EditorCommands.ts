import type { GraphController } from '@/parametric/controller/GraphController'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface EditorCommand {
	execute(): void
	undo?(): void
	redo?(): void
	isUndoable?(): boolean
}

export interface TransformNodeValues {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
}

export class HistoryController {
	private readonly undoStack: EditorCommand[] = []
	private readonly redoStack: EditorCommand[] = []

	public execute(command: EditorCommand): void {
		command.execute()
		if (command.isUndoable?.() === false || !command.undo) return
		this.undoStack.push(command)
		this.redoStack.length = 0
	}

	public undo(): void {
		const command = this.undoStack.pop()
		if (!command?.undo) return
		command.undo()
		this.redoStack.push(command)
	}

	public redo(): void {
		const command = this.redoStack.pop()
		if (!command) return
		if (command.redo) command.redo()
		else command.execute()
		this.undoStack.push(command)
	}
}

export class EditorCommandFactory {
	public constructor(private readonly graphController: GraphController) {}

	public setTransformNode(
		graphId: string,
		nodeId: string,
		before: TransformNodeValues,
		after: TransformNodeValues
	): EditorCommand {
		return new SetTransformNodeCommand(
			this.graphController,
			graphId,
			nodeId,
			before,
			after
		)
	}
}

export class SetTransformNodeCommand implements EditorCommand {
	public constructor(
		private readonly graphController: GraphController,
		private readonly graphId: string,
		private readonly nodeId: string,
		private readonly before: TransformNodeValues,
		private readonly after: TransformNodeValues
	) {}

	public execute(): void {
		this.apply(this.after)
	}

	public undo(): void {
		this.apply(this.before)
	}

	public redo(): void {
		this.apply(this.after)
	}

	public isUndoable(): boolean {
		return true
	}

	private apply(values: TransformNodeValues): void {
		this.graphController.updateNodeTransformInGraph(
			this.graphId,
			this.nodeId,
			(transform) => {
				transform.setTranslation(Vector3Value.from(values.translation))
				transform.setRotation(Vector3Value.from(values.rotation))
				transform.setScale(Vector3Value.from(values.scale))
			}
		)
	}
}
