import {
	Box3,
	BoxHelper,
	Euler,
	Matrix4,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	Quaternion,
	SphereGeometry,
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
	TransformOrigin,
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
import type { ViewportBoundsSnapshot } from '@/parametric/three/editor/ViewportAlignment'
import type { AlignmentMethod } from '@/parametric/three/editor/ViewportAlignment'

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
	private visualTransformStart: TransformNodeValues | null = null
	private transformOrigin: TransformOrigin | null = null
	private arrayDistanceStart: number | null = null
	private visualArrayDistanceStart: number | null = null
	private dragMeshMatrices = new Map<string, Matrix4>()
	private arrayDistanceAnchor: Vector3 | null = null
	private arrayDistanceSteps = 1
	private gizmoHistoryGroup = 'idle'
	private gizmoSequence = 0
	private syncingGizmo = false
	private shiftPressed = false
	private alignmentGizmoEnabled = false
	private alignmentGizmoHitTargets: Mesh[] = []
	private alignmentGizmoMarkers: Mesh[] = []
	private hoveredAlignmentMarker: Mesh | null = null

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
		window.addEventListener('keydown', this.onKeyDown)
		window.addEventListener('keyup', this.onKeyUp)
		window.addEventListener('blur', this.onWindowBlur)

		this.canvasEvents = new CanvasEventHandler(
			canvas,
			this.camera,
			() => this.alignmentGizmoHitTargets.length > 0
				? this.alignmentGizmoHitTargets
				: [...this.meshesById.values()],
			controller.interactions,
			() => this.transformControls.dragging,
			this.onAlignmentPointHover
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

	public getContentBounds(): ViewportBoundsSnapshot {
		const bounds = new Box3()
		for (const mesh of this.meshesById.values()) bounds.expandByObject(mesh)
		if (bounds.isEmpty()) {
			throw new Error('Cannot align viewport content because the current preview contains no meshes')
		}
		return {
			min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
			max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
		}
	}

	public setAlignmentGizmoEnabled(enabled: boolean): void {
		this.alignmentGizmoEnabled = enabled
		if (!enabled) {
			this.canvasEvents.clearHover()
			this.removeAlignmentGizmo()
		}
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
		window.removeEventListener('keydown', this.onKeyDown)
		window.removeEventListener('keyup', this.onKeyUp)
		window.removeEventListener('blur', this.onWindowBlur)
		this.transformControls.detach()
		this.transformControls.dispose()
		this.removeAlignmentGizmo()
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
			if (this.alignmentGizmoEnabled) {
				this.syncAlignmentGizmo(transformNode.id)
				return
			}
			this.syncTransform(transformNode, mode)
			return
		}
		if (arrayDistanceNode) {
			this.syncArrayDistance(arrayDistanceNode)
			return
		}
		this.clearGizmo()
	}

	private syncAlignmentGizmo(nodeId: string): void {
		this.attachedTransformNodeId = null
		this.attachedArrayDistanceNodeId = null
		this.transformControls.detach()
		this.removeAlignmentGizmo()
		const bounds = this.getContentBounds()
		const coordinates = {
			x: alignmentCoordinates(bounds.min.x, bounds.max.x),
			y: alignmentCoordinates(bounds.min.y, bounds.max.y),
			z: alignmentCoordinates(bounds.min.z, bounds.max.z),
		}
		const diagonal = new Vector3(
			bounds.max.x - bounds.min.x,
			bounds.max.y - bounds.min.y,
			bounds.max.z - bounds.min.z
		).length()
		const markerRadius = Math.max(diagonal / 100, 0.012)
		const hitTargetRadius = Math.max(diagonal / 80, 0.015) * 2.75
		const markerGeometry = new SphereGeometry(markerRadius, 16, 12)
		const colliderGeometry = new SphereGeometry(hitTargetRadius, 12, 8)
		const colliderMaterial = new MeshBasicMaterial({
			colorWrite: false,
			depthTest: false,
			transparent: true,
			opacity: 0,
		})
		for (const x of coordinates.x) {
			for (const y of coordinates.y) {
				for (const z of coordinates.z) {
					const methods = { x: x.method, y: y.method, z: z.method }
					const marker = new Mesh(
						markerGeometry,
						new MeshBasicMaterial({ color: getAlignmentPointColor(methods), depthTest: false })
					)
					marker.position.set(x.value, y.value, z.value)
					marker.renderOrder = 1000
					const collider = new Mesh(colliderGeometry, colliderMaterial)
					collider.position.copy(marker.position)
					collider.renderOrder = 1001
					collider.userData.alignmentPoint = {
						nodeId,
						bounds,
						methods,
					}
					collider.userData.alignmentMarker = marker
					this.scene.add(marker, collider)
					this.alignmentGizmoMarkers.push(marker)
					this.alignmentGizmoHitTargets.push(collider)
				}
			}
		}
	}

	private removeAlignmentGizmo(): void {
		if (this.alignmentGizmoHitTargets.length === 0) return
		this.onAlignmentPointHover(null)
		const colliderGeometry = this.alignmentGizmoHitTargets[0].geometry
		const colliderMaterial = this.alignmentGizmoHitTargets[0].material
		for (const hitTarget of this.alignmentGizmoHitTargets) this.scene.remove(hitTarget)
		const markerGeometry = this.alignmentGizmoMarkers[0].geometry
		for (const marker of this.alignmentGizmoMarkers) {
			this.scene.remove(marker)
			const materials = Array.isArray(marker.material) ? marker.material : [marker.material]
			for (const material of materials) material.dispose()
		}
		colliderGeometry.dispose()
		markerGeometry.dispose()
		if (Array.isArray(colliderMaterial)) {
			for (const item of colliderMaterial) item.dispose()
		} else {
			colliderMaterial.dispose()
		}
		this.alignmentGizmoHitTargets = []
		this.alignmentGizmoMarkers = []
	}

	private readonly onAlignmentPointHover = (hitTarget: Mesh | null) => {
		const marker = hitTarget?.userData.alignmentMarker as Mesh | undefined
		if (marker === this.hoveredAlignmentMarker) return
		if (this.hoveredAlignmentMarker) {
			const material = this.hoveredAlignmentMarker.material as MeshBasicMaterial
			material.color.setHex(this.hoveredAlignmentMarker.userData.baseColor as number)
		}
		this.hoveredAlignmentMarker = marker ?? null
		if (!this.hoveredAlignmentMarker) return
		const material = this.hoveredAlignmentMarker.material as MeshBasicMaterial
		this.hoveredAlignmentMarker.userData.baseColor = material.color.getHex()
		material.color.setHex(0xa3e635)
	}

	private syncTransform(node: TransformableGraphNode, mode: TransformControlsMode): void {
		this.transformOrigin = node.getTransform().getOrigin()
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
		this.transformOrigin = null
		this.transformControls.detach()
	}

	private readonly onTransformStart = () => {
		this.transformStart = this.attachedTransformNodeId ? this.readTargetValues() : null
		this.visualTransformStart = this.transformStart
		this.arrayDistanceStart = this.attachedArrayDistanceNodeId
			? this.readArrayDistance()
			: null
		this.visualArrayDistanceStart = this.arrayDistanceStart
		this.dragMeshMatrices = new Map(
			[...this.meshesById].map(([instanceId, mesh]) => [instanceId, mesh.matrix.clone()])
		)
		this.gizmoSequence += 1
		this.gizmoHistoryGroup = String(this.gizmoSequence)
	}

	private readonly onTransformChange = () => {
		if (this.syncingGizmo) return
		if (this.attachedTransformNodeId && this.transformStart) {
			const after = this.getPrecisionTransformValues(this.readTargetValues())
			if (this.shiftPressed) this.writeTargetValues(after)
			this.previewTransformDrag(after)
			this.controller.applyTransform(
				this.attachedTransformNodeId,
				this.transformStart,
				after,
				this.gizmoHistoryGroup
			)
			this.transformStart = after
			return
		}
		if (this.attachedArrayDistanceNodeId && this.arrayDistanceStart !== null) {
			const distance = this.getPrecisionArrayDistance(this.readArrayDistance())
			if (this.shiftPressed) this.writeArrayDistance(distance)
			this.previewArrayDistanceDrag(distance)
			this.controller.applyArrayDistance(
				this.attachedArrayDistanceNodeId,
				distance,
				this.gizmoHistoryGroup,
				this.shiftPressed
			)
			this.arrayDistanceStart = distance
		}
	}

	private readonly onTransformEnd = () => {
		this.transformStart = null
		this.visualTransformStart = null
		this.arrayDistanceStart = null
		this.visualArrayDistanceStart = null
		this.dragMeshMatrices.clear()
	}

	private readonly onDraggingChanged = (event: { value: unknown }) => {
		this.orbitControls.enabled = !Boolean(event.value)
	}

	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Shift') this.shiftPressed = true
	}

	private readonly onKeyUp = (event: KeyboardEvent) => {
		if (event.key === 'Shift') this.shiftPressed = false
	}

	private readonly onWindowBlur = () => {
		this.shiftPressed = false
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

	private writeTargetValues(values: TransformNodeValues): void {
		this.syncingGizmo = true
		this.transformTarget.position.set(
			values.translation.x,
			values.translation.y,
			values.translation.z
		)
		this.transformTarget.rotation.set(
			MathUtils.degToRad(values.rotation.x),
			MathUtils.degToRad(values.rotation.y),
			MathUtils.degToRad(values.rotation.z),
			'XYZ'
		)
		this.transformTarget.scale.set(values.scale.x, values.scale.y, values.scale.z)
		this.transformTarget.updateMatrixWorld(true)
		this.syncingGizmo = false
	}

	private readArrayDistance(): number {
		if (!this.arrayDistanceAnchor || !this.attachedArrayDistanceNodeId) return 0
		const axis = this.getVisibleArrayAxis()
		return (this.transformTarget.position[axis] - this.arrayDistanceAnchor[axis])
			/ this.arrayDistanceSteps
	}

	private writeArrayDistance(value: number): void {
		if (!this.arrayDistanceAnchor) return
		const axis = this.getVisibleArrayAxis()
		this.syncingGizmo = true
		this.transformTarget.position.copy(this.arrayDistanceAnchor)
		this.transformTarget.position[axis] += value * this.arrayDistanceSteps
		this.transformTarget.updateMatrixWorld(true)
		this.syncingGizmo = false
	}

	private getPrecisionTransformValues(values: TransformNodeValues): TransformNodeValues {
		if (!this.shiftPressed || !this.visualTransformStart) return values
		return {
			translation: interpolateVector(this.visualTransformStart.translation, values.translation, 0.1),
			rotation: interpolateVector(this.visualTransformStart.rotation, values.rotation, 0.1),
			scale: interpolateVector(this.visualTransformStart.scale, values.scale, 0.1),
		}
	}

	private getPrecisionArrayDistance(value: number): number {
		if (!this.shiftPressed || this.visualArrayDistanceStart === null) return value
		return this.visualArrayDistanceStart + (value - this.visualArrayDistanceStart) / 10
	}

	private previewTransformDrag(after: TransformNodeValues): void {
		if (!this.visualTransformStart || !this.transformOrigin) return
		for (const [instanceId, baseline] of this.dragMeshMatrices) {
			if (
				this.attachedTransformNodeId
				&& instanceId.startsWith(`${this.attachedTransformNodeId}/original/`)
			) continue
			const mesh = this.meshesById.get(instanceId)
			const size = mesh?.userData.sceneInstance?.size as
				| { x: number; y: number; z: number }
				| undefined
			if (!mesh || !size) continue
			const beforeMatrix = createTransformMatrix(
				this.visualTransformStart,
				this.transformOrigin,
				size
			)
			const afterMatrix = createTransformMatrix(after, this.transformOrigin, size)
			mesh.matrix.copy(afterMatrix.multiply(beforeMatrix.invert()).multiply(baseline))
			mesh.updateMatrixWorld(true)
		}
	}

	private previewArrayDistanceDrag(after: number): void {
		if (this.visualArrayDistanceStart === null || !this.attachedArrayDistanceNodeId) return
		const axis = this.getVisibleArrayAxis()
		const prefix = `${this.attachedArrayDistanceNodeId}/`
		for (const [instanceId, baseline] of this.dragMeshMatrices) {
			if (!instanceId.startsWith(prefix)) continue
			const index = Number(instanceId.slice(prefix.length).split('/', 1)[0])
			const mesh = this.meshesById.get(instanceId)
			if (!mesh || !Number.isInteger(index)) continue
			const translation = new Vector3()
			translation[axis] = (after - this.visualArrayDistanceStart) * index
			mesh.matrix.copy(new Matrix4().makeTranslation(
				translation.x,
				translation.y,
				translation.z
			).multiply(baseline))
			mesh.updateMatrixWorld(true)
		}
	}

	private getVisibleArrayAxis(): Axis {
		if (this.transformControls.showX) return 'x'
		if (this.transformControls.showY) return 'y'
		return 'z'
	}
}

function createTransformMatrix(
	values: TransformNodeValues,
	origin: TransformOrigin,
	size: { x: number; y: number; z: number }
): Matrix4 {
	const pivot = new Vector3(
		originOffset(origin.x, size.x),
		originOffset(origin.y, size.y),
		originOffset(origin.z, size.z)
	)
	const transform = new Matrix4().compose(
		new Vector3(),
		new Quaternion().setFromEuler(new Euler(
			MathUtils.degToRad(values.rotation.x),
			MathUtils.degToRad(values.rotation.y),
			MathUtils.degToRad(values.rotation.z),
			'XYZ'
		)),
		new Vector3(values.scale.x, values.scale.y, values.scale.z)
	)
	return new Matrix4()
		.makeTranslation(values.translation.x, values.translation.y, values.translation.z)
		.multiply(new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
		.multiply(transform)
		.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))
}

function originOffset(origin: 'min' | 'middle' | 'max', size: number): number {
	if (origin === 'min') return -size / 2
	if (origin === 'max') return size / 2
	return 0
}

function alignmentCoordinates(
	min: number,
	max: number
): Array<{ value: number; method: AlignmentMethod }> {
	return [
		{ value: min, method: 'min' },
		{ value: (min + max) / 2, method: 'middle' },
		{ value: max, method: 'max' },
	]
}

function getAlignmentPointColor(
	methods: Record<'x' | 'y' | 'z', AlignmentMethod>
): number {
	const middleCount = Object.values(methods).filter((method) => method === 'middle').length
	if (middleCount === 0) return 0xef4444
	if (middleCount === 1) return 0xf59e0b
	if (middleCount === 2) return 0x3b82f6
	return 0xffffff
}

function interpolateVector(
	start: { x: number; y: number; z: number },
	end: { x: number; y: number; z: number },
	amount: number
): { x: number; y: number; z: number } {
	return {
		x: start.x + (end.x - start.x) * amount,
		y: start.y + (end.y - start.y) * amount,
		z: start.z + (end.z - start.z) * amount,
	}
}
