import type { InteractionHandler } from '@/models/editor/interactions/InteractionHandler'

export class InteractionHandlerRepository {
	private readonly handlers = new Map<string, InteractionHandler>()

	public add(handler: InteractionHandler): AbortController {
		if (this.handlers.has(handler.id)) {
			throw new Error(`Cannot register duplicate model interaction handler ID "${handler.id}".`)
		}
		this.handlers.set(handler.id, handler)
		const abortController = new AbortController()
		abortController.signal.addEventListener('abort', () => {
			this.handlers.delete(handler.id)
		}, { once: true })
		return abortController
	}

	public get(id: string): InteractionHandler | undefined {
		return this.handlers.get(id)
	}

	public getEnabled(event: Parameters<InteractionHandler['isEnabled']>[0]): InteractionHandler[] {
		return [...this.handlers.values()]
			.filter((handler) => {
				if (!handler.enabled) return false
				try {
					return handler.isEnabled(event)
				} catch (cause) {
					throw new Error(
						`Model interaction handler "${handler.id}" failed while checking event `
						+ `"${event.type}" for model "${event.context.modelId}" and target `
						+ `"${event.context.target?.id ?? 'none'}". ${describe(cause)}`
					)
				}
			})
			.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
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
