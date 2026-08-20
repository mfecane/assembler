import type { ModelEditorController } from '@/models/editor/EditorController'
import type { ModelProject } from '@/models/editor/ModelProject'
import type { ModelReactBridge } from '@/models/editor/ReactBridge'
import { ModelPreviewScene } from '@/models/ModelPreviewScene'

export class ModelViewportEditor {
	private scene: ModelPreviewScene | null = null
	private resizeObserver: ResizeObserver | null = null
	private removeProjectListener: (() => void) | null = null
	private removeBridgeListener: (() => void) | null = null
	private previewSizeListener: AbortController | null = null

	public constructor(
		private readonly project: ModelProject,
		private readonly controller: ModelEditorController,
		private readonly bridge: ModelReactBridge
	) {}

	public attach(canvas: HTMLCanvasElement, container: HTMLElement): void {
		if (this.scene) throw new Error(`Model viewport for "${this.project.modelId}" is already attached.`)
		try {
			this.bridge.update({ viewportError: null })
			this.scene = new ModelPreviewScene(canvas, container, this.project.modelId)
			this.bridge.update({
				uvViewAvailable: this.scene.hasUvs(),
				uvViewEnabled: false,
				uvAttribute: this.scene.getUvAttribute(),
			})
			this.previewSizeListener = this.scene.addPreviewSizeListener((axis, size) => {
				this.controller.setPreviewSize(axis, size)
			})
			this.controller.interactions.attach(canvas, this.scene)
			this.resizeObserver = new ResizeObserver(() => this.resize())
			this.resizeObserver.observe(container)
			this.removeProjectListener = this.project.subscribe(() => this.synchronizeProject())
			this.removeBridgeListener = this.bridge.subscribe(() => this.synchronizeBridge())
			this.synchronizeProject()
			this.synchronizeBridge()
		} catch (cause) {
			this.detach()
			this.controller.reportViewportError('create or initialize 3D preview', cause)
		}
	}

	public detach(): void {
		this.controller.interactions.detach()
		this.resizeObserver?.disconnect()
		this.resizeObserver = null
		this.removeProjectListener?.()
		this.removeProjectListener = null
		this.removeBridgeListener?.()
		this.removeBridgeListener = null
		this.previewSizeListener?.abort()
		this.previewSizeListener = null
		this.scene?.dispose()
		this.scene = null
	}

	public dispose(): void {
		this.detach()
	}

	private resize(): void {
		try {
			this.scene?.resize()
		} catch (cause) {
			this.controller.reportViewportError('resize 3D preview', cause)
		}
	}

	private synchronizeProject(): void {
		try {
			const snapshot = this.project.getSnapshot()
			this.scene?.setStretchAxes(snapshot.stretchEnabled ? snapshot.stretchAxes : [])
			this.scene?.setPivot(snapshot.pivot)
		} catch (cause) {
			this.controller.reportViewportError('update stretch boxes', cause)
		}
	}

	private synchronizeBridge(): void {
		try {
			const snapshot = this.bridge.getSnapshot()
			this.scene?.setPreviewSize(snapshot.previewSize)
			this.scene?.setActiveStretchAxis(snapshot.activeStretchAxis)
			this.scene?.setScaleToolActive(snapshot.scaleToolActive)
			this.scene?.setPivotEditingMode(snapshot.pivotEditingMode)
			this.scene?.setPivotFineTuneEnabled(snapshot.pivotFineTuneEnabled)
			this.scene?.setCheckerTextureEnabled(snapshot.checkerTextureEnabled)
			this.scene?.setCheckerTextureScale(snapshot.checkerTextureScale)
			this.scene?.setUvViewEnabled(snapshot.uvViewEnabled)
		} catch (cause) {
			this.controller.reportViewportError('synchronize model preview controls', cause)
		}
	}
}
