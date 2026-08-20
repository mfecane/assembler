import { ModelPivot } from '@/models/ModelPivotMetadata'
import type { ModelEditorController } from '@/models/editor/EditorController'
import {
	PIVOT_ANCHOR_INTERACTION_TARGET,
	PIVOT_INTERACTION_TARGET,
	type ModelInteractionEvent,
} from '@/models/editor/interactions/InteractionEvent'
import {
	InteractionHandlerResult,
	type InteractionHandler,
} from '@/models/editor/interactions/InteractionHandler'

export class PivotInteractionHandler implements InteractionHandler {
	public readonly id = 'model-pivot'
	public readonly priority = 200
	public enabled = true

	public constructor(private readonly controller: ModelEditorController) {}

	public isEnabled(event: ModelInteractionEvent): boolean {
		return (
			event.type === 'widget-commit'
			&& event.context.target?.type === PIVOT_INTERACTION_TARGET
		) || (
			event.type === 'click'
			&& event.context.target?.type === PIVOT_ANCHOR_INTERACTION_TARGET
		)
	}

	public onEvent(event: ModelInteractionEvent): InteractionHandlerResult {
		const pivot = event.context.target?.data
		if (!(pivot instanceof ModelPivot)) {
			throw new Error(
				`Pivot interaction handler received target "${event.context.target?.id ?? 'none'}" `
				+ `for model "${event.context.modelId}" with invalid data ${describe(pivot)}.`
			)
		}
		this.controller.updatePivot(pivot)
		if (event.context.target?.type === PIVOT_ANCHOR_INTERACTION_TARGET) {
			this.controller.deactivatePivotEditing()
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
