import {
	InteractionContext,
	InteractionEventModifiers,
	type InteractionHitTester,
	ModelInteractionEvent,
	type CanvasEventType,
} from '@/models/editor/interactions/InteractionEvent'
import type { InteractionHandlerRouter } from '@/models/editor/interactions/InteractionHandlerRouter'

const DRAG_THRESHOLD_PX = 4
const CLICK_DELAY_MS = 250

type InteractionErrorListener = (operation: string, cause: unknown) => void

export class CanvasEventHandler {
	private readonly abortController = new AbortController()
	private readonly errorListeners = new Set<InteractionErrorListener>()
	private activePointerId: number | null = null
	private startX = 0
	private startY = 0
	private previousX = 0
	private previousY = 0
	private dragging = false
	private clickTimer: ReturnType<typeof setTimeout> | null = null

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly modelId: string,
		private readonly hitTester: InteractionHitTester,
		private readonly router: InteractionHandlerRouter
	) {
		const signal = this.abortController.signal
		canvas.addEventListener('pointerdown', this.onPointerDown, { signal })
		canvas.addEventListener('pointermove', this.onPointerMove, { signal })
		canvas.addEventListener('pointerup', this.onPointerUp, { signal })
		canvas.addEventListener('pointercancel', this.onPointerCancel, { signal })
		canvas.addEventListener('dblclick', this.onDoubleClick, { signal })
		canvas.addEventListener('wheel', this.onWheel, { signal })
	}

	public addErrorListener(listener: InteractionErrorListener): AbortController {
		this.errorListeners.add(listener)
		const abortController = new AbortController()
		abortController.signal.addEventListener('abort', () => {
			this.errorListeners.delete(listener)
		}, { once: true })
		return abortController
	}

	public dispose(): void {
		this.abortController.abort()
		if (this.clickTimer) clearTimeout(this.clickTimer)
		this.clickTimer = null
		this.errorListeners.clear()
	}

	private readonly onPointerDown = (raw: PointerEvent): void => {
		if (this.activePointerId !== null) return
		const position = this.getPosition(raw)
		this.activePointerId = raw.pointerId
		this.startX = position.x
		this.startY = position.y
		this.previousX = position.x
		this.previousY = position.y
		this.dragging = false
		this.canvas.setPointerCapture(raw.pointerId)
		this.dispatch('pointer-down', position.x, position.y, 0, 0, raw)
	}

	private readonly onPointerMove = (raw: PointerEvent): void => {
		const position = this.getPosition(raw)
		if (raw.pointerId !== this.activePointerId) {
			this.dispatch('pointer-move', position.x, position.y, raw.movementX, raw.movementY, raw)
			return
		}
		const dx = position.x - this.previousX
		const dy = position.y - this.previousY
		const distance = Math.hypot(position.x - this.startX, position.y - this.startY)
		if (!this.dragging && distance >= DRAG_THRESHOLD_PX) {
			this.dragging = true
			this.dispatch('drag-start', position.x, position.y, dx, dy, raw)
		}
		if (this.dragging) this.dispatch('drag', position.x, position.y, dx, dy, raw)
		else this.dispatch('pointer-move', position.x, position.y, dx, dy, raw)
		this.previousX = position.x
		this.previousY = position.y
	}

	private readonly onPointerUp = (raw: PointerEvent): void => {
		if (raw.pointerId !== this.activePointerId) return
		const position = this.getPosition(raw)
		const dx = position.x - this.previousX
		const dy = position.y - this.previousY
		this.dispatch(this.dragging ? 'drag-end' : 'pointer-up', position.x, position.y, dx, dy, raw)
		if (!this.dragging) this.scheduleClick(position.x, position.y, raw)
		this.resetPointer(raw.pointerId)
	}

	private readonly onPointerCancel = (raw: PointerEvent): void => {
		if (raw.pointerId !== this.activePointerId) return
		const position = this.getPosition(raw)
		if (this.dragging) this.dispatch('drag-end', position.x, position.y, 0, 0, raw)
		this.router.releaseCapture()
		this.resetPointer(raw.pointerId)
	}

	private readonly onDoubleClick = (raw: MouseEvent): void => {
		if (this.clickTimer) clearTimeout(this.clickTimer)
		this.clickTimer = null
		const position = this.getPosition(raw)
		this.dispatch('double-click', position.x, position.y, 0, 0, raw)
	}

	private readonly onWheel = (raw: WheelEvent): void => {
		const position = this.getPosition(raw)
		this.dispatch('wheel', position.x, position.y, raw.deltaX, raw.deltaY, raw)
	}

	private scheduleClick(x: number, y: number, raw: PointerEvent): void {
		if (this.clickTimer) clearTimeout(this.clickTimer)
		try {
			const event = this.buildEvent('click', x, y, 0, 0, raw)
			this.clickTimer = setTimeout(() => {
				this.clickTimer = null
				this.route(event)
			}, CLICK_DELAY_MS)
		} catch (cause) {
			this.reportError('build click', cause)
		}
	}

	private dispatch(type: CanvasEventType, x: number, y: number, dx: number, dy: number, raw: Event): void {
		try {
			this.route(this.buildEvent(type, x, y, dx, dy, raw))
		} catch (cause) {
			this.reportError(`build ${type}`, cause)
		}
	}

	private buildEvent(
		type: CanvasEventType,
		x: number,
		y: number,
		dx: number,
		dy: number,
		raw: Event
	): ModelInteractionEvent {
		const context = new InteractionContext(this.modelId, this.hitTester.hitTest(x, y))
		return new ModelInteractionEvent(type, x, y, dx, dy, readModifiers(raw), context, raw)
	}

	private route(event: ModelInteractionEvent): void {
		void this.router.route(event).catch((cause: unknown) => {
			this.reportError(`route ${event.type}`, cause)
		})
	}

	private getPosition(raw: MouseEvent): { x: number; y: number } {
		const bounds = this.canvas.getBoundingClientRect()
		return { x: raw.clientX - bounds.left, y: raw.clientY - bounds.top }
	}

	private resetPointer(pointerId: number): void {
		if (this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId)
		this.activePointerId = null
		this.dragging = false
	}

	private reportError(operation: string, cause: unknown): void {
		for (const listener of this.errorListeners) listener(operation, cause)
	}
}

function readModifiers(raw: Event): InteractionEventModifiers {
	if (!(raw instanceof MouseEvent)) return new InteractionEventModifiers(false, false, false, false)
	return new InteractionEventModifiers(raw.altKey, raw.ctrlKey, raw.metaKey, raw.shiftKey)
}
