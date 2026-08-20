import type { ModelInteractionEvent } from '@/models/editor/interactions/InteractionEvent'
import type { InteractionHandler } from '@/models/editor/interactions/InteractionHandler'
import { InteractionHandlerRepository } from '@/models/editor/interactions/InteractionHandlerRepository'

export class InteractionHandlerRouter {
	private capturedHandlerId: string | null = null
	private queue = Promise.resolve()
	private generation = 0

	public constructor(private readonly handlers: InteractionHandlerRepository) {}

	public route(event: ModelInteractionEvent): Promise<void> {
		const generation = this.generation
		const routed = this.queue.then(() => {
			if (generation === this.generation) return this.routeImmediately(event)
		})
		this.queue = routed.catch(() => undefined)
		return routed
	}

	public releaseCapture(handlerId?: string): void {
		if (handlerId && this.capturedHandlerId !== handlerId) return
		this.capturedHandlerId = null
	}

	public invalidatePendingEvents(): void {
		this.generation += 1
		this.capturedHandlerId = null
	}

	private async routeImmediately(event: ModelInteractionEvent): Promise<void> {
		const captured = this.getCapturedHandler()
		if (captured && !await this.routeToHandler(captured, event)) return
		for (const handler of this.handlers.getEnabled(event)) {
			if (handler.id === captured?.id) continue
			if (!await this.routeToHandler(handler, event)) return
		}
	}

	private getCapturedHandler(): InteractionHandler | null {
		if (!this.capturedHandlerId) return null
		const captured = this.handlers.get(this.capturedHandlerId)
		if (captured?.enabled) return captured
		this.capturedHandlerId = null
		return null
	}

	private async routeToHandler(handler: InteractionHandler, event: ModelInteractionEvent): Promise<boolean> {
		let result
		try {
			result = await handler.onEvent(event)
		} catch (cause) {
			throw new Error(
				`Model interaction handler "${handler.id}" failed while processing event `
				+ `"${event.type}" for model "${event.context.modelId}" at (${event.x}, ${event.y}), `
				+ `target "${event.context.target?.id ?? 'none'}". ${describe(cause)}`
			)
		}
		if (!result) {
			throw new Error(
				`Model interaction handler "${handler.id}" returned no InteractionHandlerResult for `
				+ `event "${event.type}" on model "${event.context.modelId}".`
			)
		}
		if (result.capture && result.releaseCapture) {
			throw new Error(
				`Model interaction handler "${handler.id}" requested capture and release for event `
				+ `"${event.type}" on model "${event.context.modelId}". Choose one capture transition.`
			)
		}
		if (result.releaseCapture && this.capturedHandlerId === handler.id) this.capturedHandlerId = null
		if (result.capture) this.capturedHandlerId = handler.id
		return result.pass
	}
}

function describe(cause: unknown): string {
	if (cause instanceof Error) return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	try {
		return JSON.stringify(cause) ?? String(cause)
	} catch {
		return String(cause)
	}
}
