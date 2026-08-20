import type { ModelPreviewScene } from '@/models/ModelPreviewScene'
import type { ModelEditorController } from '@/models/editor/EditorController'
import { CanvasEventHandler } from '@/models/editor/interactions/CanvasEventHandler'
import {
	InteractionContext,
	InteractionEventModifiers,
	ModelInteractionEvent,
} from '@/models/editor/interactions/InteractionEvent'
import type { InteractionHandler } from '@/models/editor/interactions/InteractionHandler'
import { InteractionHandlerRepository } from '@/models/editor/interactions/InteractionHandlerRepository'
import { InteractionHandlerRouter } from '@/models/editor/interactions/InteractionHandlerRouter'
import {
	StretchAxisCommitInteractionHandler,
} from '@/models/editor/interactions/handlers/StretchAxisCommitInteractionHandler'
import {
	StretchBoundaryWidgetInteractionHandler,
} from '@/models/editor/interactions/handlers/StretchBoundaryWidgetInteractionHandler'
import { PivotInteractionHandler } from '@/models/editor/interactions/handlers/PivotInteractionHandler'

export class ModelInteractionController {
	private readonly handlers = new InteractionHandlerRepository()
	private readonly router = new InteractionHandlerRouter(this.handlers)
	private canvasEventHandler: CanvasEventHandler | null = null
	private sceneListener: AbortController | null = null
	private canvasErrorListener: AbortController | null = null
	private stretchBoundaryHandlerSubscription: AbortController | null = null

	public constructor(private readonly controller: ModelEditorController) {
		this.handlers.add(new StretchAxisCommitInteractionHandler(controller))
		this.handlers.add(new PivotInteractionHandler(controller))
	}

	public addHandler(handler: InteractionHandler): AbortController {
		return this.handlers.add(handler)
	}

	public releaseCapture(handlerId?: string): void {
		this.router.releaseCapture(handlerId)
	}

	public attach(canvas: HTMLCanvasElement, scene: ModelPreviewScene): void {
		if (this.canvasEventHandler || this.sceneListener) {
			throw new Error(
				`Cannot attach another interaction source for model "${this.controller.project.modelId}". `
				+ 'Detach the current viewport interaction source first.'
			)
		}
		this.stretchBoundaryHandlerSubscription = this.handlers.add(
			new StretchBoundaryWidgetInteractionHandler(scene)
		)
		this.canvasEventHandler = new CanvasEventHandler(
			canvas,
			this.controller.project.modelId,
			scene,
			this.router
		)
		this.canvasErrorListener = this.canvasEventHandler.addErrorListener((operation, cause) => {
			this.controller.reportInteractionError(operation, cause)
		})
		this.sceneListener = scene.addWidgetInteractionListener((interaction) => {
			const event = new ModelInteractionEvent(
				interaction.type,
				interaction.x,
				interaction.y,
				0,
				0,
				new InteractionEventModifiers(false, false, false, false),
				new InteractionContext(this.controller.project.modelId, null, interaction.target),
				interaction.raw
			)
			void this.router.route(event).catch((cause: unknown) => {
				this.controller.reportInteractionError(
					`route ${interaction.type} from widget "${interaction.target.id}"`,
					cause
				)
			})
		})
	}

	public detach(): void {
		this.stretchBoundaryHandlerSubscription?.abort()
		this.stretchBoundaryHandlerSubscription = null
		this.canvasErrorListener?.abort()
		this.canvasErrorListener = null
		this.canvasEventHandler?.dispose()
		this.canvasEventHandler = null
		this.sceneListener?.abort()
		this.sceneListener = null
		this.router.invalidatePendingEvents()
	}

	public dispose(): void {
		this.detach()
	}
}
