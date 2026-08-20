import { ModelStretchAxis } from '@/models/ModelStretchMetadata'
import type { ModelEditorController } from '@/models/editor/EditorController'
import {
	STRETCH_AXIS_INTERACTION_TARGET,
	type ModelInteractionEvent,
} from '@/models/editor/interactions/InteractionEvent'
import {
	InteractionHandlerResult,
	type InteractionHandler,
} from '@/models/editor/interactions/InteractionHandler'

export class StretchAxisCommitInteractionHandler implements InteractionHandler {
	public readonly id = 'stretch-axis-commit'
	public readonly priority = 100
	public enabled = true

	public constructor(private readonly controller: ModelEditorController) {}

	public isEnabled(event: ModelInteractionEvent): boolean {
		return event.type === 'widget-commit'
			&& event.context.target?.type === STRETCH_AXIS_INTERACTION_TARGET
	}

	public onEvent(event: ModelInteractionEvent): InteractionHandlerResult {
		const stretchAxis = event.context.target?.data
		if (!(stretchAxis instanceof ModelStretchAxis)) {
			throw new Error(
				`Stretch-axis interaction handler received target "${event.context.target?.id ?? 'none'}" `
				+ `for model "${event.context.modelId}" with invalid data ${describe(stretchAxis)}.`
			)
		}
		this.controller.updateStretchAxis(stretchAxis)
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
