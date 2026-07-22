import {
	BoxHelper,
	Euler,
	MathUtils,
	Mesh,
	Object3D,
	type PerspectiveCamera,
	type Scene,
	type WebGLRenderer,
} from 'three'
import {
	TransformControls,
	type TransformControlsMode,
} from 'three/examples/jsm/controls/TransformControls.js'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EvaluatedMesh } from '@/parametric/evaluation/GraphEvaluator'
import { TransformGraphNode } from '@/parametric/model/GraphNode'
import { createSceneSetup } from '@/parametric/three/SceneSetup'
import { syncMeshes } from '@/parametric/three/syncMeshes'
import type { ViewportEditorController } from '@/parametric/three/editor/ViewportEditorController'
import { CanvasEventHandler } from '@/parametric/three/editor/InteractionSystem'
import type { TransformNodeValues } from '@/parametric/three/editor/EditorCommands'

export class ViewportScene {
	private readonly scene: Scene
	private readonly camera: PerspectiveCamera
	private readonly renderer: WebGLRenderer
	private readonly orbitControls: OrbitControls
	private readonly disposeSceneSetup: () => void
	private readonly meshesById = new Map<string, Mesh>()
	private readonly ghostMeshesById = new Map<string, Mesh>()
	private readonly transformControls: TransformControls
	private readonly transformTarget = new Object3D()
	private readonly canvasEvents: CanvasEventHandler
	private selectionHelper: BoxHelper | null = null
	private attachedTransformNodeId: string | null = null
	private transformStart: TransformNodeValues | null = null
	private syncingTransform = false

	public constructor(
		canvas: HTMLCanvasElement,
		private readonly container: HTMLElement,
		private readonly controller: ViewportEditorController
	) {
		const setup = createSceneSetup(canvas)
		this.scene = setup.scene
		this.camera = setup.camera
		this.renderer = setup.renderer
		this.orbitControls = setup.controls
		this.disposeSceneSetup = setup.dispose

		this.scene.add(this.transformTarget)
		this.transformControls = new TransformControls(this.camera, canvas)
		this.transformControls.setTranslationSnap(0.01)
		this.transformControls.setRotationSnap(MathUtils.degToRad(15))
		this.transformControls.setScaleSnap(0.01)
		this.scene.add(this.transformControls.getHelper())
		this.transformControls.addEventListener('mouseDown', this.onTransformStart)
		this.transformControls.addEventListener('objectChange', this.onTransformChange)
		this.transformControls.addEventListener('mouseUp', this.onTransformEnd)
		this.transformControls.addEventListener('dragging-changed', this.onDraggingChanged)

		this.canvasEvents = new CanvasEventHandler(
			canvas,
			this.camera,
			() => [...this.meshesById.values()],
			controller.interactions,
			() => this.transformControls.dragging
		)
		this.resize()
	}

	public resize(): void {
		const { clientWidth, clientHeight } = this.container
		if (clientWidth === 0 || clientHeight === 0) return
		this.renderer.setSize(clientWidth, clientHeight, false)
		this.camera.aspect = clientWidth / clientHeight
		this.camera.updateProjectionMatrix()
	}

	public sync(
		evaluatedMeshes: EvaluatedMesh[],
		ghostMeshes: EvaluatedMesh[],
		selectedMeshInstanceId: string | null,
		transformNode: TransformGraphNode | null,
		transformMode: TransformControlsMode
	): void {
		syncMeshes(this.scene, this.meshesById, evaluatedMeshes)
		syncMeshes(this.scene, this.ghostMeshesById, ghostMeshes, { ghost: true })
		this.syncSelection(selectedMeshInstanceId)
		this.syncTransform(transformNode, transformMode)
	}

	public dispose(): void {
		this.canvasEvents.dispose()
		this.transformControls.removeEventListener('mouseDown', this.onTransformStart)
		this.transformControls.removeEventListener('objectChange', this.onTransformChange)
		this.transformControls.removeEventListener('mouseUp', this.onTransformEnd)
		this.transformControls.removeEventListener('dragging-changed', this.onDraggingChanged)
		this.transformControls.detach()
		this.transformControls.dispose()
		this.removeSelectionHelper()
		for (const mesh of this.meshesById.values()) {
			mesh.geometry.dispose()
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
			for (const material of materials) material.dispose()
		}
		this.meshesById.clear()
		for (const mesh of this.ghostMeshesById.values()) {
			mesh.geometry.dispose()
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
			for (const material of materials) material.dispose()
		}
		this.ghostMeshesById.clear()
		this.disposeSceneSetup()
	}

	private syncSelection(meshInstanceId: string | null): void {
		const selectedMesh = meshInstanceId ? this.meshesById.get(meshInstanceId) : undefined
		if (!selectedMesh) {
			this.removeSelectionHelper()
			return
		}
		if (this.selectionHelper?.userData.target === selectedMesh) {
			this.selectionHelper.update()
			return
		}
		this.removeSelectionHelper()
		this.selectionHelper = new BoxHelper(selectedMesh, 0xeaceac)
		this.selectionHelper.userData.target = selectedMesh
		this.scene.add(this.selectionHelper)
	}

	private removeSelectionHelper(): void {
		if (!this.selectionHelper) return
		this.scene.remove(this.selectionHelper)
		this.selectionHelper.geometry.dispose()
		this.selectionHelper.material.dispose()
		this.selectionHelper = null
	}

	private syncTransform(
		node: TransformGraphNode | null,
		mode: TransformControlsMode
	): void {
		this.transformControls.setMode(mode)
		if (!node) {
			this.attachedTransformNodeId = null
			this.transformControls.detach()
			return
		}

		this.syncingTransform = true
		const translation = node.getTranslation()
		const rotation = node.getRotation()
		const scale = node.getScale()
		this.transformTarget.position.set(translation.x, translation.y, translation.z)
		this.transformTarget.rotation.set(
			MathUtils.degToRad(rotation.x),
			MathUtils.degToRad(rotation.y),
			MathUtils.degToRad(rotation.z),
			'XYZ'
		)
		this.transformTarget.scale.set(scale.x, scale.y, scale.z)
		this.transformTarget.updateMatrixWorld(true)
		this.syncingTransform = false

		if (this.attachedTransformNodeId !== node.id) {
			this.attachedTransformNodeId = node.id
			this.transformControls.attach(this.transformTarget)
		}
	}

	private readonly onTransformStart = () => {
		this.transformStart = this.readTargetValues()
	}

	private readonly onTransformChange = () => {
		if (this.syncingTransform || !this.attachedTransformNodeId || !this.transformStart) return
		this.controller.applyTransform(
			this.attachedTransformNodeId,
			this.transformStart,
			this.readTargetValues()
		)
		this.transformStart = this.readTargetValues()
	}

	private readonly onTransformEnd = () => {
		this.transformStart = null
	}

	private readonly onDraggingChanged = (event: { value: unknown }) => {
		this.orbitControls.enabled = !Boolean(event.value)
	}

	private readTargetValues(): TransformNodeValues {
		const rotation = this.transformTarget.rotation as Euler
		return {
			translation: {
				x: this.transformTarget.position.x,
				y: this.transformTarget.position.y,
				z: this.transformTarget.position.z,
			},
			rotation: {
				x: MathUtils.radToDeg(rotation.x),
				y: MathUtils.radToDeg(rotation.y),
				z: MathUtils.radToDeg(rotation.z),
			},
			scale: {
				x: this.transformTarget.scale.x,
				y: this.transformTarget.scale.y,
				z: this.transformTarget.scale.z,
			},
		}
	}
}
