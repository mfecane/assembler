import type { EditorController } from '@/parametric/editor/EditorController'
import type { ReactBridge } from '@/parametric/editor/ReactBridge'
import { emptySceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import { ArrayGraphNode, isTransformableGraphNode } from '@/parametric/model/GraphNode'
import { ViewportEditorController } from '@/parametric/three/editor/ViewportEditorController'
import { ViewportScene } from '@/parametric/three/editor/ViewportScene'
import {
	copyViewportAlignmentRequest,
	type ViewportAlignmentRequest,
} from '@/parametric/three/editor/ViewportAlignment'

export class ViewportEditor {
	private static readonly EVALUATION_DEBOUNCE_MS = 300
	public readonly controller: ViewportEditorController
	private scene: ViewportScene | null = null
	private resizeObserver: ResizeObserver | null = null
	private readonly unsubscribeGraph: () => void
	private evaluationRevision: number
	private evaluationSequence = 0
	private evaluationTimeout: number | null = null
	private alignmentGizmoEnabled = false

	public constructor(
		private readonly editorController: EditorController,
		public readonly bridge: ReactBridge
	) {
		this.evaluationRevision = editorController.getSnapshot().evaluationRevision
		this.controller = new ViewportEditorController(
			editorController,
			this.bridge,
			() => this.scheduleSceneEvaluation()
		)
		this.unsubscribeGraph = editorController.subscribe(() => {
			const evaluationRevision = editorController.getSnapshot().evaluationRevision
			if (evaluationRevision === this.evaluationRevision) return
			this.evaluationRevision = evaluationRevision
			this.controller.handleGraphChange()
		})
	}

	public attach(canvas: HTMLCanvasElement, container: HTMLElement): void {
		this.detach()
		try {
			this.scene = new ViewportScene(canvas, container, this.controller)
			this.scene.setAlignmentGizmoEnabled(this.alignmentGizmoEnabled)
			this.resizeObserver = new ResizeObserver(() => this.scene?.resize())
			this.resizeObserver.observe(container)
			this.bridge.update({ error: null })
			this.scheduleSceneEvaluation()
		} catch (cause) {
			const reason = describeError(cause)
			const error = [
				'Failed to initialize the 3D editor.',
				`Canvas size: ${canvas.clientWidth}×${canvas.clientHeight}.`,
				`Container size: ${container.clientWidth}×${container.clientHeight}.`,
				reason,
			].join(' ')
			console.error(error, {
				cause,
				canvasSize: { width: canvas.clientWidth, height: canvas.clientHeight },
				containerSize: { width: container.clientWidth, height: container.clientHeight },
			})
			this.bridge.update({ error })
		}
	}

	public detach(): void {
		this.cancelSceneEvaluation()
		this.resizeObserver?.disconnect()
		this.resizeObserver = null
		this.scene?.dispose()
		this.scene = null
	}

	public dispose(): void {
		this.detach()
		this.unsubscribeGraph()
	}

	public alignTransform(nodeId: string, request: ViewportAlignmentRequest): boolean {
		try {
			if (!this.scene) throw new Error('Cannot align viewport content before the 3D scene is attached')
			this.controller.alignTransform(nodeId, this.scene.getContentBounds(), request)
			this.bridge.update({
				alignmentSettings: copyViewportAlignmentRequest(request),
				error: null,
			})
			return true
		} catch (cause) {
			const error = [
				`Failed to align transform-capable node "${nodeId}".`,
				`Active graph: "${this.editorController.getSnapshot().activeGraphId}".`,
				describeError(cause),
			].join(' ')
			console.error(error, { cause, nodeId, request })
			this.bridge.update({ error })
			return false
		}
	}

	public setAlignmentGizmoEnabled(enabled: boolean): void {
		this.alignmentGizmoEnabled = enabled
		this.scene?.setAlignmentGizmoEnabled(enabled)
		this.scheduleSceneEvaluation()
	}

	private scheduleSceneEvaluation(): void {
		this.evaluationSequence += 1
		const sequence = this.evaluationSequence
		if (this.evaluationTimeout !== null) window.clearTimeout(this.evaluationTimeout)
		this.evaluationTimeout = window.setTimeout(() => {
			this.evaluationTimeout = null
			void this.evaluateAndSyncScene(sequence)
		}, ViewportEditor.EVALUATION_DEBOUNCE_MS)
	}

	private cancelSceneEvaluation(): void {
		this.evaluationSequence += 1
		if (this.evaluationTimeout !== null) window.clearTimeout(this.evaluationTimeout)
		this.evaluationTimeout = null
	}

	private async evaluateAndSyncScene(sequence: number): Promise<void> {
		if (!this.scene || sequence !== this.evaluationSequence) return
		await yieldToBrowser()
		if (!this.scene || sequence !== this.evaluationSequence) return
		const graphSnapshot = this.editorController.getSnapshot()
		const bridgeSnapshot = this.bridge.getSnapshot()
		try {
			const graphOutputMetadata = this.editorController.evaluateGraphOutput(
				graphSnapshot.activeGraphId
			)
			const metadata = bridgeSnapshot.previewNodeId
				? this.editorController.evaluateGeometryOutput(
					graphSnapshot.activeGraphId,
					bridgeSnapshot.previewNodeId
				)
				: graphOutputMetadata
			const transformNode = bridgeSnapshot.transformNodeId
				? graphSnapshot.model.getNode(bridgeSnapshot.transformNodeId)
				: null
			const arrayDistanceNode = bridgeSnapshot.arrayDistanceNodeId
				? graphSnapshot.model.getNode(bridgeSnapshot.arrayDistanceNodeId)
				: null

			await yieldToBrowser()
			if (!this.scene || sequence !== this.evaluationSequence) return
			this.scene.sync(
				metadata,
				bridgeSnapshot.previewNodeId ? graphOutputMetadata : emptySceneMetadata(),
				bridgeSnapshot.selectedMeshInstanceId,
				isTransformableGraphNode(transformNode) ? transformNode : null,
				arrayDistanceNode instanceof ArrayGraphNode ? arrayDistanceNode : null,
				bridgeSnapshot.transformMode
			)
			if (this.bridge.getSnapshot().error) this.bridge.update({ error: null })
		} catch (cause) {
			if (sequence !== this.evaluationSequence) return
			const error = [
				'Failed to evaluate graph metadata or synchronize the 3D scene.',
				`Active graph: "${graphSnapshot.activeGraphId}".`,
				`Preview node: "${bridgeSnapshot.previewNodeId ?? 'none'}".`,
				`Transform node: "${bridgeSnapshot.transformNodeId ?? 'none'}".`,
				`Array distance node: "${bridgeSnapshot.arrayDistanceNodeId ?? 'none'}".`,
				describeError(cause),
			].join(' ')
			console.error(error, {
				cause,
				activeGraphId: graphSnapshot.activeGraphId,
				previewNodeId: bridgeSnapshot.previewNodeId,
				transformNodeId: bridgeSnapshot.transformNodeId,
				arrayDistanceNodeId: bridgeSnapshot.arrayDistanceNodeId,
			})
			this.bridge.update({ error })
		}
	}
}

function yieldToBrowser(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, 0))
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
