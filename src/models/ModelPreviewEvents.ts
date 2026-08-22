import type { ModelGeometryAxis } from '@/models/ModelStretchMetadata'
import type { WidgetInteraction } from '@/models/editor/interactions/InteractionEvent'

type WidgetInteractionListener = (interaction: WidgetInteraction) => void
type PreviewSizeListener = (axis: ModelGeometryAxis, size: number) => void

export class ModelPreviewEvents {
	private readonly widgetInteractionListeners = new Set<WidgetInteractionListener>()
	private readonly previewSizeListeners = new Set<PreviewSizeListener>()

	public addWidgetInteractionListener(listener: WidgetInteractionListener): AbortController {
		return this.addListener(this.widgetInteractionListeners, listener)
	}

	public addPreviewSizeListener(listener: PreviewSizeListener): AbortController {
		return this.addListener(this.previewSizeListeners, listener)
	}

	public publishWidgetInteraction(interaction: WidgetInteraction): void {
		for (const listener of this.widgetInteractionListeners) listener(interaction)
	}

	public publishPreviewSize(axis: ModelGeometryAxis, size: number): void {
		for (const listener of this.previewSizeListeners) listener(axis, size)
	}

	public dispose(): void {
		this.widgetInteractionListeners.clear()
		this.previewSizeListeners.clear()
	}

	private addListener<T>(listeners: Set<T>, listener: T): AbortController {
		listeners.add(listener)
		const abortController = new AbortController()
		abortController.signal.addEventListener('abort', () => listeners.delete(listener), { once: true })
		return abortController
	}
}
