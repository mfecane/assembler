import type { ModelInteractionController } from '@/models/editor/interactions/ModelInteractionController'
import type { ModelReactBridge } from '@/models/editor/ReactBridge'
import type { ModelTool } from '@/models/editor/tools/ModelTool'

class RegisteredModelTool {
	public constructor(
		public readonly tool: ModelTool,
		public readonly interactionRegistration: AbortController
	) {}
}

export class ModelToolController {
	private readonly tools = new Map<string, RegisteredModelTool>()
	private activeToolId: string | null = null

	public constructor(
		private readonly interactions: ModelInteractionController,
		private readonly bridge: ModelReactBridge
	) {}

	public add(tool: ModelTool): AbortController {
		if (this.tools.has(tool.id)) throw new Error(`Cannot register duplicate model tool ID "${tool.id}".`)
		tool.enabled = false
		const registered = new RegisteredModelTool(tool, this.interactions.addHandler(tool))
		this.tools.set(tool.id, registered)

		const registration = new AbortController()
		registration.signal.addEventListener('abort', () => this.remove(tool.id), { once: true })
		return registration
	}

	public activate(toolId: string): void {
		if (this.activeToolId === toolId) return
		const next = this.tools.get(toolId)?.tool
		if (!next) {
			throw new Error(
				`Cannot activate unregistered model tool "${toolId}". `
				+ `Registered tool IDs: ${JSON.stringify([...this.tools.keys()].sort())}.`
			)
		}
		this.deactivate()
		next.activate()
		next.enabled = true
		this.activeToolId = toolId
		this.bridge.update({ activeToolId: toolId })
	}

	public deactivate(): void {
		if (!this.activeToolId) return
		const current = this.tools.get(this.activeToolId)?.tool
		if (!current) {
			throw new Error(`Active model tool "${this.activeToolId}" is missing from the tool repository.`)
		}
		current.enabled = false
		try {
			current.deactivate()
		} finally {
			this.activeToolId = null
			this.interactions.releaseCapture(current.id)
			this.bridge.update({ activeToolId: null })
		}
	}

	public getActiveToolId(): string | null {
		return this.activeToolId
	}

	public dispose(): void {
		try {
			this.deactivate()
		} finally {
			for (const toolId of [...this.tools.keys()]) this.remove(toolId)
		}
	}

	private remove(toolId: string): void {
		const registered = this.tools.get(toolId)
		if (!registered) return
		if (this.activeToolId === toolId) this.deactivate()
		registered.interactionRegistration.abort()
		try {
			registered.tool.dispose()
		} finally {
			this.tools.delete(toolId)
		}
	}
}
