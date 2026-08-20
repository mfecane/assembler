import type { ModelInteractionEvent } from '@/models/editor/interactions/InteractionEvent'

export class InteractionHandlerResult {
	public capture = false
	public releaseCapture = false
	public pass = true

	public setHandled(): InteractionHandlerResult {
		this.pass = false
		return this
	}

	public setCapture(): InteractionHandlerResult {
		this.capture = true
		this.pass = false
		return this
	}

	public setReleaseCapture(): InteractionHandlerResult {
		this.releaseCapture = true
		return this
	}

	public setPass(): InteractionHandlerResult {
		this.pass = true
		return this
	}
}

export interface InteractionHandler {
	readonly id: string
	readonly priority: number
	enabled: boolean
	isEnabled(event: ModelInteractionEvent): boolean
	onEvent(event: ModelInteractionEvent): InteractionHandlerResult | Promise<InteractionHandlerResult>
}
