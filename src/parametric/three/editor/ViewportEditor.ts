import type { GraphController } from '@/parametric/controller/GraphController'
import type { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import { ViewportEditorController } from '@/parametric/three/editor/ViewportEditorController'
import { ViewportReactBridge } from '@/parametric/three/editor/ViewportReactBridge'
import { ViewportScene } from '@/parametric/three/editor/ViewportScene'

export class ViewportEditor {
	public readonly bridge = new ViewportReactBridge()
	public readonly controller: ViewportEditorController
	private scene: ViewportScene | null = null
	private resizeObserver: ResizeObserver | null = null
	private readonly unsubscribeGraph: () => void

	public constructor(
		private readonly graphController: GraphController,
		private readonly evaluator: GraphEvaluator
	) {
		this.controller = new ViewportEditorController(
			graphController,
			this.bridge,
			() => this.syncScene()
		)
		this.unsubscribeGraph = graphController.subscribe(() => {
			this.controller.handleGraphChange()
		})
	}

	public attach(canvas: HTMLCanvasElement, container: HTMLElement): void {
		this.detach()
		try {
			this.scene = new ViewportScene(canvas, container, this.controller)
			this.resizeObserver = new ResizeObserver(() => this.scene?.resize())
			this.resizeObserver.observe(container)
			this.bridge.update({ error: null })
			this.syncScene()
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
		this.resizeObserver?.disconnect()
		this.resizeObserver = null
		this.scene?.dispose()
		this.scene = null
	}

	public dispose(): void {
		this.detach()
		this.unsubscribeGraph()
	}

	private syncScene(): void {
		if (!this.scene) return
		const graphSnapshot = this.graphController.getSnapshot()
		const bridgeSnapshot = this.bridge.getSnapshot()
		const graphOutputMeshes = this.evaluator.evaluateGraphOutput(
			graphSnapshot.document,
			graphSnapshot.activeGraphId
		)
		const evaluatedMeshes = bridgeSnapshot.previewNodeId
			? this.evaluator.evaluateGeometryOutput(
				graphSnapshot.document,
				graphSnapshot.activeGraphId,
				bridgeSnapshot.previewNodeId
			)
			: graphOutputMeshes
		const transform = bridgeSnapshot.transformNodeId
			? this.graphController.getNodeTransform(bridgeSnapshot.transformNodeId)
			: undefined

		this.scene.sync(
			evaluatedMeshes,
			bridgeSnapshot.previewNodeId ? graphOutputMeshes : [],
			bridgeSnapshot.selectedMeshInstanceId,
			transform ? bridgeSnapshot.transformNodeId : null,
			transform ?? null,
			bridgeSnapshot.transformMode
		)
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
