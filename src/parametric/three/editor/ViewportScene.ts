import {
	Box3,
	BoxHelper,
	Euler,
	MathUtils,
	Mesh,
	Object3D,
	Vector3,
	type PerspectiveCamera,
	type Scene,
	type WebGLRenderer,
} from 'three'
import {
	TransformControls,
	type TransformControlsMode,
} from 'three/examples/jsm/controls/TransformControls.js'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import type {
	ArrayGraphNode,
	Axis,
	TransformableGraphNode,
} from '@/parametric/model/GraphNode'
import { createSceneSetup } from '@/parametric/three/SceneSetup'
import { syncSceneMetadata } from '@/parametric/three/syncMeshes'
import type { ViewportEditorController } from '@/parametric/three/editor/ViewportEditorController'
import { CanvasEventHandler } from '@/parametric/three/editor/InteractionSystem'
import {
	ARRAY_DISTANCE_SNAP,
	type TransformNodeValues,
} from '@/parametric/editor/EditorController'

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
	private attachedArrayDistanceNodeId: string | null = null
	private transformStart: TransformNodeValues | null = null
	private arrayDistanceStart: number | null = null
	private arrayDistanceAnchor: Vector3 | null = null
	private arrayDistanceSteps = 1
	private gizmoHistoryGroup = 'idle'
	private gizmoSequence = 0
	private syncingGizmo = false

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
		this.transformControls.setTranslationSnap(ARRAY_DISTANCE_SNAP)
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
		metadata: SceneMetadata,
		ghostMetadata: SceneMetadata,
		selectedMeshInstanceId: string | null,
		transformNode: TransformableGraphNode | null,
		arrayDistanceNode: ArrayGraphNode | null,
		transformMode: TransformControlsMode
	): void {
		syncSceneMetadata(this.scene, this.meshesById, metadata)
		syncSceneMetadata(this.scene, this.ghostMeshesById, ghostMetadata, { ghost: true })
		this.syncSelection(selectedMeshInstanceId)
		this.syncGizmo(transformNode, arrayDistanceNode, transformMode)
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

	private syncGizmo(
		transformNode: TransformableGraphNode | null,
		arrayDistanceNode: ArrayGraphNode | null,
		mode: TransformControlsMode
	): void {
		if (transformNode) {
			this.syncTransform(transformNode, mode)
			return
		}
		if (arrayDistanceNode) {
			this.syncArrayDistance(arrayDistanceNode)
			return
		}
		this.clearGizmo()
	}

	private syncTransform(node: TransformableGraphNode, mode: TransformControlsMode): void {
		this.transformControls.setMode(mode)
		this.transformControls.showX = true
		this.transformControls.showY = true
		this.transformControls.showZ = true

		this.syncingGizmo = true
		const transform = node.getTransform()
		const translation = transform.getTranslation()
		const rotation = transform.getRotation()
		const scale = transform.getScale()
		this.transformTarget.position.set(translation.x, translation.y, translation.z)
		this.transformTarget.rotation.set(
			MathUtils.degToRad(rotation.x),
			MathUtils.degToRad(rotation.y),
			MathUtils.degToRad(rotation.z),
			'XYZ'
		)
		this.transformTarget.scale.set(scale.x, scale.y, scale.z)
		this.transformTarget.updateMatrixWorld(true)
		this.syncingGizmo = false

		if (this.attachedTransformNodeId !== node.id || this.attachedArrayDistanceNodeId !== null) {
			this.attachedTransformNodeId = node.id
			this.attachedArrayDistanceNodeId = null
			this.transformControls.attach(this.transformTarget)
		}
	}

	private syncArrayDistance(node: ArrayGraphNode): void {
		const placement = this.getArrayGizmoPlacement(node)
		if (!placement) {
			this.clearGizmo()
			return
		}

		this.transformControls.setMode('translate')
		this.transformControls.setSpace('world')
		this.transformControls.showX = node.getAxis() === 'x'
		this.transformControls.showY = node.getAxis() === 'y'
		this.transformControls.showZ = node.getAxis() === 'z'
		this.syncingGizmo = true
		this.arrayDistanceAnchor = placement.anchor
		this.arrayDistanceSteps = placement.steps
		this.transformTarget.position.copy(placement.target)
		this.transformTarget.rotation.set(0, 0, 0)
		this.transformTarget.scale.set(1, 1, 1)
		this.transformTarget.updateMatrixWorld(true)
		this.syncingGizmo = false

		if (this.attachedArrayDistanceNodeId !== node.id || this.attachedTransformNodeId !== null) {
			this.attachedTransformNodeId = null
			this.attachedArrayDistanceNodeId = node.id
			this.transformControls.attach(this.transformTarget)
		}
	}

	private getArrayGizmoPlacement(
		node: ArrayGraphNode
	): { anchor: Vector3; target: Vector3; steps: number } | null {
		const boundsByIndex = new Map<number, Box3>()
		const prefix = `${node.id}/`
		for (const [instanceId, mesh] of this.meshesById) {
			if (!instanceId.startsWith(prefix)) continue
			const remainder = instanceId.slice(prefix.length)
			const separator = remainder.indexOf('/')
			if (separator < 1) continue
			const index = Number(remainder.slice(0, separator))
			if (!Number.isInteger(index) || index < 0) continue
			const bounds = boundsByIndex.get(index) ?? new Box3()
			bounds.expandByObject(mesh)
			boundsByIndex.set(index, bounds)
		}

		const firstBounds = boundsByIndex.get(0)
		if (!firstBounds || firstBounds.isEmpty()) return null
		const anchor = firstBounds.getCenter(new Vector3())
		const lastIndex = Math.max(...boundsByIndex.keys())
		if (lastIndex > 0) {
			const lastBounds = boundsByIndex.get(lastIndex)
			if (lastBounds && !lastBounds.isEmpty()) {
				return {
					anchor,
					target: lastBounds.getCenter(new Vector3()),
					steps: lastIndex,
				}
			}
		}

		const target = anchor.clone()
		target[node.getAxis()] += node.getOffset()
		return { anchor, target, steps: 1 }
	}

	private clearGizmo(): void {
		this.attachedTransformNodeId = null
		this.attachedArrayDistanceNodeId = null
		this.arrayDistanceAnchor = null
		this.transformControls.detach()
	}

	private readonly onTransformStart = () => {
		this.transformStart = this.attachedTransformNodeId ? this.readTargetValues() : null
		this.arrayDistanceStart = this.attachedArrayDistanceNodeId
			? this.readArrayDistance()
			: null
		this.gizmoSequence += 1
		this.gizmoHistoryGroup = String(this.gizmoSequence)
	}

	private readonly onTransformChange = () => {
		if (this.syncingGizmo) return
		if (this.attachedTransformNodeId && this.transformStart) {
			this.controller.applyTransform(
				this.attachedTransformNodeId,
				this.transformStart,
				this.readTargetValues(),
				this.gizmoHistoryGroup
			)
			this.transformStart = this.readTargetValues()
			return
		}
		if (this.attachedArrayDistanceNodeId && this.arrayDistanceStart !== null) {
			const distance = this.readArrayDistance()
			this.controller.applyArrayDistance(
				this.attachedArrayDistanceNodeId,
				distance,
				this.gizmoHistoryGroup
			)
			this.arrayDistanceStart = distance
		}
	}

	private readonly onTransformEnd = () => {
		this.transformStart = null
		this.arrayDistanceStart = null
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

	private readArrayDistance(): number {
		if (!this.arrayDistanceAnchor || !this.attachedArrayDistanceNodeId) return 0
		const axis = this.getVisibleArrayAxis()
		return (this.transformTarget.position[axis] - this.arrayDistanceAnchor[axis])
			/ this.arrayDistanceSteps
	}

	private getVisibleArrayAxis(): Axis {
		if (this.transformControls.showX) return 'x'
		if (this.transformControls.showY) return 'y'
		return 'z'
	}
}
