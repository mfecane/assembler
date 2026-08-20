import type { EditorController } from '@/parametric/editor/EditorController'
import {
	LayoutViewportScene,
	type LayoutSlotScreenPosition,
} from '@/layout/LayoutViewportScene'

export interface LayoutViewportSnapshot {
	error: string | null
	addSlots: LayoutSlotScreenPosition[]
}

type LayoutViewportListener = () => void

export class LayoutViewportEditor {
	private readonly listeners = new Set<LayoutViewportListener>()
	private readonly unsubscribeDocument: () => void
	private scene: LayoutViewportScene | null = null
	private resizeObserver: ResizeObserver | null = null
	private slotPositionSubscription: AbortController | null = null
	private evaluationRevision: number
	private evaluationSequence = 0
	private disposalSequence = 0
	private disposed = false
	private snapshot: LayoutViewportSnapshot = { error: null, addSlots: [] }

	public constructor(private readonly controller: EditorController) {
		this.evaluationRevision = controller.getSnapshot().evaluationRevision
		this.unsubscribeDocument = controller.subscribe(() => {
			const revision = controller.getSnapshot().evaluationRevision
			if (revision === this.evaluationRevision) return
			this.evaluationRevision = revision
			this.scheduleEvaluation()
		})
	}

	public readonly getSnapshot = (): LayoutViewportSnapshot => this.snapshot

	public readonly subscribe = (listener: LayoutViewportListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public attach(canvas: HTMLCanvasElement, container: HTMLElement): void {
		if (this.disposed) throw new Error('Cannot attach a disposed layout viewport editor.')
		this.disposalSequence += 1
		this.detach()
		try {
			this.scene = new LayoutViewportScene(canvas, container)
			this.slotPositionSubscription = this.scene.addOnSlotPositionUpdate((addSlots) => {
				this.publish({ ...this.snapshot, addSlots })
			})
			this.resizeObserver = new ResizeObserver(() => this.scene?.resize())
			this.resizeObserver.observe(container)
			this.publish({ ...this.snapshot, error: null })
			this.scheduleEvaluation()
		} catch (cause) {
			this.reportError('initialize the layout 3D viewport', cause)
		}
	}

	public detach(): void {
		this.evaluationSequence += 1
		this.resizeObserver?.disconnect()
		this.resizeObserver = null
		this.slotPositionSubscription?.abort()
		this.slotPositionSubscription = null
		this.scene?.dispose()
		this.scene = null
		this.publish({ ...this.snapshot, addSlots: [] })
	}

	public dispose(): void {
		this.detach()
		const sequence = ++this.disposalSequence
		queueMicrotask(() => {
			if (sequence !== this.disposalSequence || this.scene) return
			this.disposed = true
			this.unsubscribeDocument()
			this.listeners.clear()
		})
	}

	private scheduleEvaluation(): void {
		this.evaluationSequence += 1
		const sequence = this.evaluationSequence
		queueMicrotask(() => this.evaluate(sequence))
	}

	private evaluate(sequence: number): void {
		if (!this.scene || sequence !== this.evaluationSequence) return
		try {
			const evaluated = this.controller.evaluateActiveLayout()
			if (!this.scene || sequence !== this.evaluationSequence) return
			this.scene.sync(evaluated.metadata, evaluated.addSlot)
			if (this.snapshot.error) this.publish({ ...this.snapshot, error: null })
		} catch (cause) {
			this.reportError('evaluate and render the active product layout', cause)
		}
	}

	private reportError(action: string, cause: unknown): void {
		const graphSnapshot = this.controller.getSnapshot()
		const layout = graphSnapshot.document.getLayout()
		const error = [
			`Failed to ${action}.`,
			`Active product: "${layout.activeProductId}".`,
			`Document version: ${graphSnapshot.documentVersion}.`,
			`Products: ${JSON.stringify(layout.products.map((item) => ({
				id: item.id,
				layoutId: item.layoutId,
				items: item.instances.map((instance) => ({
					id: instance.id,
					graphId: instance.graphId,
				})),
			})))}.`,
			describeError(cause),
		].join(' ')
		console.error(error, { cause, layout, graphSnapshot })
		this.publish({ ...this.snapshot, error })
	}

	private publish(snapshot: LayoutViewportSnapshot): void {
		if (
			snapshot.error === this.snapshot.error
			&& JSON.stringify(snapshot.addSlots) === JSON.stringify(this.snapshot.addSlots)
		) return
		this.snapshot = snapshot
		for (const listener of this.listeners) listener()
	}
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause)
	} catch {
		return String(cause)
	}
}
