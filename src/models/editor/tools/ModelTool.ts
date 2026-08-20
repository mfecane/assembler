import type { InteractionHandler } from '@/models/editor/interactions/InteractionHandler'

export interface ModelTool extends InteractionHandler {
	activate(): void
	deactivate(): void
	dispose(): void
}
