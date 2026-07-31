export interface EditorCommand {
	readonly label: string
	readonly mergeKey?: string
	execute(): boolean
	undo(): void
	redo(): void
	merge?(next: EditorCommand): boolean
}
