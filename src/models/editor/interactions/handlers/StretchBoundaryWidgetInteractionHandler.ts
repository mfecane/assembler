import type { ModelPreviewScene } from '@/models/ModelPreviewScene'
import {
	STRETCH_BOUNDARY_INTERACTION_TARGET,
	StretchBoundaryTarget,
	type ModelInteractionEvent,
} from '@/models/editor/interactions/InteractionEvent'
import {
	InteractionHandlerResult,
	type InteractionHandler,
} from '@/models/editor/interactions/InteractionHandler'

export class StretchBoundaryWidgetInteractionHandler implements InteractionHandler {
	public readonly id = 'stretch-boundary-widget'
	public readonly priority = 1_000
	public enabled = true

	public constructor(private readonly scene: ModelPreviewScene) {}

	public isEnabled(event: ModelInteractionEvent): boolean {
		return event.context.target?.type === STRETCH_BOUNDARY_INTERACTION_TARGET
	}

	public onEvent(event: ModelInteractionEvent): InteractionHandlerResult {
		if (event.type.startsWith('widget-')) return new InteractionHandlerResult().setPass()
		if (event.type === 'pointer-down') {
			const target = event.context.target?.data
			if (!(target instanceof StretchBoundaryTarget)) {
				throw new Error(
					`Cannot start stretch-box drag for model "${event.context.modelId}": interaction target `
					+ `"${event.context.target?.id ?? 'none'}" contains invalid data ${describe(target)}.`
				)
			}
			this.scene.startStretchBoundaryDrag(target, event.x, event.y)
			return new InteractionHandlerResult().setCapture().setHandled()
		}
		if (event.type === 'drag-start' || event.type === 'drag') {
			this.scene.updateStretchBoundaryDrag(event.x, event.y)
			return new InteractionHandlerResult().setHandled()
		}
		if (event.type === 'pointer-up' || event.type === 'drag-end') {
			this.scene.finishStretchBoundaryDrag(event.x, event.y)
			return new InteractionHandlerResult().setReleaseCapture().setHandled()
		}
		return new InteractionHandlerResult().setHandled()
	}
}

function describe(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value)
	} catch {
		return String(value)
	}
}
