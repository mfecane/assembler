import {
	Box3,
	DoubleSide,
	Group,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	NearestFilter,
	type Object3D,
	Plane,
	PlaneGeometry,
	Points,
	PointsMaterial,
	Raycaster,
	RepeatWrapping,
	SphereGeometry,
	SRGBColorSpace,
	type Texture,
	TextureLoader,
	Vector2,
	Vector3,
} from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js'
import {
	ModelStretchAxis,
	getMinimumStretchBoxLength,
	roundStretchBoxValue,
	type ModelGeometryAxis,
	type StretchBoundary,
} from '@/models/ModelStretchMetadata'
import { readModelBoundingBox } from '@/models/ModelBoundsMetadata'
import { createModelStretchSizeConstraint } from '@/models/ModelStretchSizeConstraint'
import { ModelStretchService } from '@/models/ModelStretchService'
import { DEFAULT_MODEL_TEXEL_SIZE_RATIO } from '@/models/ModelTexelSizeRatio'
import {
	ModelPivot,
	type ModelPivotEditingMode,
} from '@/models/ModelPivotMetadata'
import { ModelUvAttribute } from '@/models/ModelUvAttribute'
import { ModelUvPreview } from '@/models/ModelUvPreview'
import { meshRepository } from '@/parametric/three/MeshRepository'
import { createSceneSetup, type SceneSetupResult } from '@/parametric/three/SceneSetup'
import {
	InteractionHit,
	InteractionTarget,
	MODEL_INTERACTION_TARGET,
	PIVOT_ANCHOR_INTERACTION_TARGET,
	PIVOT_INTERACTION_TARGET,
	STRETCH_AXIS_INTERACTION_TARGET,
	STRETCH_BOUNDARY_INTERACTION_TARGET,
	StretchBoundaryTarget,
	type WidgetEventType,
	WidgetInteraction,
} from '@/models/editor/interactions/InteractionEvent'
import checkerTextureUrl from '../../assets/textures/checker.png?url'

type WidgetInteractionListener = (interaction: WidgetInteraction) => void
type PreviewSizeListener = (axis: ModelGeometryAxis, size: number) => void

interface StretchGizmo {
	control: TransformControls
	target: Group
}

interface StretchBoxWidget {
	axis: ModelGeometryAxis
	boxIndex: number
	planes: Mesh[]
	handles: Mesh[]
	colliders: Mesh[]
}

interface StretchAffectedOverlay {
	axis: ModelGeometryAxis
	boxIndex: number
	mesh: Mesh
	minimumPlane: Plane
	maximumPlane: Plane
}

interface StretchBoundaryDrag {
	target: StretchBoundaryTarget
	plane: Plane
	offset: number
}

type PivotAnchorMethod = 'min' | 'middle' | 'max'

const AXIS_COLORS: Record<ModelGeometryAxis, number> = {
	x: 0xef4444,
	y: 0x22c55e,
	z: 0x3b82f6,
}
const GEOMETRY_AXES: ModelGeometryAxis[] = ['x', 'y', 'z']
const EDIT_OVERLAY_COLOR = 0xfacc15
const STRETCH_PLANE_PERPENDICULAR_MARGIN = 0.1

export class ModelPreviewScene {
	private readonly setup: SceneSetupResult
	private readonly mesh: Mesh
	private readonly material: MeshStandardMaterial
	private readonly checkerTexture: Texture
	private readonly uvPreview: ModelUvPreview | null
	private readonly viewHelper: ViewHelper
	private readonly viewHelperRenderListener: AbortController
	private readonly sourceBounds: Box3
	private readonly sourceSize: Vector3
	private readonly pivotMarker: Mesh
	private readonly pivotMarkerRadius: number
	private readonly cameraUpdateSubscription: AbortController
	private readonly cameraWidgetRadii = new Map<Mesh, number>()
	private readonly modelSize: Record<ModelGeometryAxis, number>
	private readonly sourcePositions: Float32Array
	private readonly sourceUvs: Float32Array | null
	private readonly uvAttribute: ModelUvAttribute | null
	private readonly raycaster = new Raycaster()
	private readonly stretchService = new ModelStretchService()
	private readonly widgetInteractionListeners = new Set<WidgetInteractionListener>()
	private readonly previewSizeListeners = new Set<PreviewSizeListener>()
	private stretchAxes: ModelStretchAxis[] = []
	private texelSizeRatio = DEFAULT_MODEL_TEXEL_SIZE_RATIO
	private stretchGizmos: StretchGizmo[] = []
	private stretchBoxWidgets: StretchBoxWidget[] = []
	private stretchBoundaryHitTargets: Mesh[] = []
	private hoveredStretchBoundary: Mesh | null = null
	private activeStretchBoundaryDrag: StretchBoundaryDrag | null = null
	private activeStretchAxis: ModelGeometryAxis | null = null
	private scaleToolActive = false
	private pivot = new ModelPivot(0, 0, 0)
	private pivotEditingMode: ModelPivotEditingMode | null = null
	private pivotFineTuneEnabled = false
	private pivotMoveGizmo: StretchGizmo | null = null
	private pivotAnchorHitTargets: Mesh[] = []
	private pivotAnchorMarkers: Mesh[] = []
	private hoveredPivotAnchor: Mesh | null = null
	private previewSize: Record<ModelGeometryAxis, number> = { x: 1, y: 1, z: 1 }
	private editOverlay: {
		wireframe: Mesh
		vertices: Points
		affected: StretchAffectedOverlay[]
	} | null = null

	public constructor(
		canvas: HTMLCanvasElement,
		private readonly container: HTMLElement,
		modelId: string
	) {
		const geometry = meshRepository.createGeometry(modelId)
		if (!geometry) {
			throw new Error(
				`Cannot preview model "${modelId}" because its geometry is missing from the loaded mesh repository.`
			)
		}

		const position = geometry.getAttribute('position')
		if (!position) {
			geometry.dispose()
			throw new Error(`Cannot preview model "${modelId}" because its geometry has no position attribute.`)
		}
		if (position.itemSize !== 3) {
			geometry.dispose()
			throw new Error(
				`Cannot preview model "${modelId}" because its position attribute itemSize is `
				+ `${position.itemSize}; expected 3 components per vertex.`
			)
		}
		this.sourcePositions = Float32Array.from(position.array)
		const uv = geometry.getAttribute('uv')
		if (uv && (uv.itemSize < 2 || uv.count !== position.count)) {
			geometry.dispose()
			throw new Error(
				`Cannot preview model "${modelId}" because its UV attribute is incompatible with positions. `
				+ `Position count/itemSize: ${position.count}/${position.itemSize}. `
				+ `UV count/itemSize: ${uv.count}/${uv.itemSize}.`
			)
		}
		this.sourceUvs = uv ? Float32Array.from(uv.array) : null
		this.uvAttribute = uv ? new ModelUvAttribute(uv) : null

		this.setup = createSceneSetup(canvas)
		this.viewHelper = new ViewHelper(this.setup.camera, canvas)
		this.viewHelper.setLabels('X', 'Y', 'Z')
		this.viewHelper.location.right = 12
		this.viewHelper.location.bottom = 12
		this.viewHelperRenderListener = this.setup.addRenderListener((deltaSeconds) => {
			if (this.viewHelper.animating) this.viewHelper.update(deltaSeconds)
			const autoClear = this.setup.renderer.autoClear
			this.setup.renderer.autoClear = false
			try {
				this.viewHelper.render(this.setup.renderer)
			} finally {
				this.setup.renderer.autoClear = autoClear
			}
		})
		canvas.addEventListener('pointerup', this.handleViewHelperClick)
		canvas.addEventListener('pointerleave', this.handlePointerLeave)
		this.material = new MeshStandardMaterial({ color: 0xd7d9dd, metalness: 0.08, roughness: 0.7 })
		this.checkerTexture = new TextureLoader().load(checkerTextureUrl)
		this.checkerTexture.colorSpace = SRGBColorSpace
		this.checkerTexture.wrapS = RepeatWrapping
		this.checkerTexture.wrapT = RepeatWrapping
		this.checkerTexture.magFilter = NearestFilter
		this.checkerTexture.minFilter = NearestFilter
		this.mesh = new Mesh(geometry, this.material)
		this.mesh.castShadow = true
		this.mesh.receiveShadow = true
		this.mesh.userData.interactionTarget = new InteractionTarget(modelId, MODEL_INTERACTION_TARGET)
		this.setup.scene.add(this.mesh)
		this.uvPreview = uv ? new ModelUvPreview(geometry) : null
		if (this.uvPreview) this.setup.scene.add(this.uvPreview.group)
		this.sourceBounds = new Box3().setFromObject(this.mesh)
		this.setup.fitShadowsToBounds(this.sourceBounds)
		this.sourceSize = this.sourceBounds.getSize(new Vector3())
		this.pivotMarkerRadius = Math.max(this.sourceSize.length() / 70, 0.015)
		this.pivotMarker = new Mesh(
			new SphereGeometry(this.pivotMarkerRadius, 16, 12),
			new MeshBasicMaterial({
				color: EDIT_OVERLAY_COLOR,
				depthTest: false,
				depthWrite: false,
			})
		)
		this.pivotMarker.renderOrder = 1_500
		this.setup.scene.add(this.pivotMarker)
		this.cameraWidgetRadii.set(this.pivotMarker, this.pivotMarkerRadius)
		this.cameraUpdateSubscription = this.setup.cameraUpdates.subscribe(() => {
			this.updateCameraScaledWidgets()
		})
		this.modelSize = readModelBoundingBox(modelId).size
		this.previewSize = {
			x: this.sourceSize.x,
			y: this.sourceSize.y,
			z: this.sourceSize.z,
		}
		try {
			this.resize()
			this.fitCamera(modelId)
			this.viewHelper.center.copy(this.setup.controls.target)
		} catch (cause) {
			this.dispose()
			throw cause
		}
	}

	public addWidgetInteractionListener(listener: WidgetInteractionListener): AbortController {
		this.widgetInteractionListeners.add(listener)
		const abortController = new AbortController()
		abortController.signal.addEventListener('abort', () => {
			this.widgetInteractionListeners.delete(listener)
		}, { once: true })
		return abortController
	}

	public addPreviewSizeListener(listener: PreviewSizeListener): AbortController {
		this.previewSizeListeners.add(listener)
		const abortController = new AbortController()
		abortController.signal.addEventListener('abort', () => {
			this.previewSizeListeners.delete(listener)
		}, { once: true })
		return abortController
	}

	public hasUvs(): boolean {
		return this.uvPreview !== null
	}

	public getUvAttribute(): ModelUvAttribute | null {
		return this.uvAttribute
	}

	public setStretchAxes(stretchAxes: ModelStretchAxis[]): void {
		this.stretchAxes = [...stretchAxes]
		if (this.activeStretchAxis && !stretchAxes.some((item) => item.axis === this.activeStretchAxis)) {
			this.activeStretchAxis = null
		}
		this.applyStretchPreview()
		this.rebuildEditingGizmos()
	}

	public setTexelSizeRatio(texelSizeRatio: number): void {
		if (this.texelSizeRatio === texelSizeRatio) return
		this.texelSizeRatio = texelSizeRatio
		this.applyStretchPreview()
	}

	public setPreviewSize(previewSize: Record<ModelGeometryAxis, number>): void {
		for (const axis of GEOMETRY_AXES) {
			if (!Number.isFinite(previewSize[axis]) || previewSize[axis] <= 0) {
				throw new Error(
					`Cannot preview model with invalid ${axis.toUpperCase()} size ${previewSize[axis]}. `
					+ `Received sizes: ${JSON.stringify(previewSize)}.`
				)
			}
		}
		this.previewSize = { ...previewSize }
		this.applyStretchPreview()
		this.synchronizeScaleTarget()
	}

	public setActiveStretchAxis(axis: ModelGeometryAxis | null): void {
		if (axis && !this.stretchAxes.some((item) => item.axis === axis)) {
			throw new Error(
				`Cannot edit ${axis.toUpperCase()} planes because the configured axes are `
				+ `${this.stretchAxes.map((item) => item.axis.toUpperCase()).join(', ') || 'empty'}.`
			)
		}
		if (this.activeStretchAxis === axis) return
		this.activeStretchAxis = axis
		this.rebuildEditingGizmos()
	}

	public setScaleToolActive(active: boolean): void {
		if (this.scaleToolActive === active) return
		this.scaleToolActive = active
		this.rebuildEditingGizmos()
	}

	public setPivot(pivot: ModelPivot): void {
		if (this.pivot.equals(pivot)) return
		this.pivot = pivot
		this.pivotMarker.position.set(pivot.x, pivot.y, pivot.z)
		this.applyStretchPreview()
		if (this.pivotMoveGizmo) this.pivotMoveGizmo.target.position.set(pivot.x, pivot.y, pivot.z)
	}

	public setPivotEditingMode(mode: ModelPivotEditingMode | null): void {
		if (this.pivotEditingMode === mode) return
		this.pivotEditingMode = mode
		this.rebuildEditingGizmos()
	}

	public setPivotFineTuneEnabled(enabled: boolean): void {
		if (this.pivotFineTuneEnabled === enabled) return
		this.pivotFineTuneEnabled = enabled
		this.rebuildEditingGizmos()
	}

	public setCheckerTextureEnabled(enabled: boolean): void {
		this.material.map = enabled ? this.checkerTexture : null
		this.material.color.setHex(enabled ? 0xffffff : 0xd7d9dd)
		this.material.needsUpdate = true
	}

	public setCheckerTextureScale(scale: number): void {
		this.checkerTexture.repeat.set(scale, scale)
	}

	public startStretchBoundaryDrag(target: StretchBoundaryTarget, x: number, y: number): void {
		if (this.activeStretchBoundaryDrag) {
			throw new Error(
				`Cannot start ${target.axis.toUpperCase()} box ${target.boxIndex} ${target.boundary} drag because `
				+ `a ${this.activeStretchBoundaryDrag.target.axis.toUpperCase()} box `
				+ `${this.activeStretchBoundaryDrag.target.boxIndex} `
				+ `${this.activeStretchBoundaryDrag.target.boundary} drag is already active.`
			)
		}
		const stretchAxis = this.requireStretchAxis(target.axis)
		const box = stretchAxis.boxes[target.boxIndex]
		if (!box) {
			throw new Error(
				`Cannot drag missing ${target.axis.toUpperCase()} stretch box ${target.boxIndex}; `
				+ `the axis contains ${stretchAxis.boxes.length} box(es).`
			)
		}
		const axisDirection = axisVector(target.axis)
		const cameraDirection = this.setup.camera.getWorldDirection(new Vector3())
		const planeNormal = cameraDirection.addScaledVector(
			axisDirection,
			-cameraDirection.dot(axisDirection)
		)
		if (planeNormal.lengthSq() < 0.000001) {
			throw new Error(
				`Cannot drag the ${target.axis.toUpperCase()} stretch-box face from this camera angle because `
				+ 'the axis projects to a point. Orbit the camera so the axis is visible and try again.'
			)
		}
		const faceCenter = this.sourceBounds.getCenter(new Vector3())
		faceCenter[target.axis] = box[target.boundary]
		const plane = new Plane().setFromNormalAndCoplanarPoint(planeNormal.normalize(), faceCenter)
		const intersection = this.intersectPointerPlane(x, y, plane, target)
		this.activeStretchBoundaryDrag = {
			target,
			plane,
			offset: box[target.boundary] - intersection[target.axis],
		}
		this.setup.controls.enabled = false
		this.publishStretchWidgetInteraction('widget-start', stretchAxis, target.boxIndex, target.boundary)
	}

	public updateStretchBoundaryDrag(x: number, y: number): void {
		const drag = this.activeStretchBoundaryDrag
		if (!drag) return
		const stretchAxis = this.requireStretchAxis(drag.target.axis)
		const intersection = this.intersectPointerPlane(x, y, drag.plane, drag.target)
		const value = this.clampBoundary(
			stretchAxis,
			drag.target.boxIndex,
			drag.target.boundary,
			intersection[drag.target.axis] + drag.offset
		)
		const updated = stretchAxis.withBoundary(drag.target.boxIndex, drag.target.boundary, value)
		this.stretchAxes = this.stretchAxes.map((axis) => axis.axis === updated.axis ? updated : axis)
		this.updateStretchBoxWidget(updated, drag.target.boxIndex)
		this.publishStretchWidgetInteraction(
			'widget-change',
			updated,
			drag.target.boxIndex,
			drag.target.boundary
		)
	}

	public finishStretchBoundaryDrag(x: number, y: number): void {
		const drag = this.activeStretchBoundaryDrag
		if (!drag) return
		this.updateStretchBoundaryDrag(x, y)
		const stretchAxis = this.requireStretchAxis(drag.target.axis)
		this.activeStretchBoundaryDrag = null
		this.setup.controls.enabled = true
		this.publishStretchWidgetInteraction(
			'widget-commit',
			stretchAxis,
			drag.target.boxIndex,
			drag.target.boundary
		)
	}

	public setUvViewEnabled(enabled: boolean): void {
		if (!this.uvPreview) {
			if (enabled) throw new Error('Cannot enable UV view because this model has no UV attribute.')
			return
		}
		this.uvPreview.group.visible = enabled
	}

	public resize(): void {
		const { clientWidth, clientHeight } = this.container
		if (clientWidth === 0 || clientHeight === 0) return
		this.setup.renderer.setSize(clientWidth, clientHeight, false)
		this.setup.camera.aspect = clientWidth / clientHeight
		this.setup.camera.updateProjectionMatrix()
	}

	public hitTest(x: number, y: number): InteractionHit | null {
		const bounds = this.setup.renderer.domElement.getBoundingClientRect()
		if (bounds.width === 0 || bounds.height === 0) return null
		const pointer = new Vector2(
			(x / bounds.width) * 2 - 1,
			-(y / bounds.height) * 2 + 1
		)
		this.raycaster.setFromCamera(pointer, this.setup.camera)
		const widgetTargets = [...this.pivotAnchorHitTargets, ...this.stretchBoundaryHitTargets]
		const targets = widgetTargets.length > 0
			? widgetTargets
			: this.setup.scene.children
		const intersections = this.raycaster.intersectObjects(targets, true)
		for (const intersection of intersections) {
			let object: Object3D | null = intersection.object
			while (object) {
				const target = object.userData.interactionTarget
				if (target instanceof InteractionTarget) {
					this.updatePivotAnchorHover(
						target.type === PIVOT_ANCHOR_INTERACTION_TARGET ? intersection.object : null
					)
					this.updateStretchBoundaryHover(
						target.type === STRETCH_BOUNDARY_INTERACTION_TARGET ? intersection.object : null
					)
					return new InteractionHit(
						target,
						intersection.distance,
						intersection.point.x,
						intersection.point.y,
						intersection.point.z
					)
				}
				object = object.parent
			}
		}
		this.updatePivotAnchorHover(null)
		this.updateStretchBoundaryHover(null)
		return null
	}

	public dispose(): void {
		this.clearEditingGizmos()
		this.cameraUpdateSubscription.abort()
		this.setup.renderer.domElement.removeEventListener('pointerup', this.handleViewHelperClick)
		this.setup.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave)
		this.viewHelperRenderListener.abort()
		this.viewHelper.dispose()
		this.widgetInteractionListeners.clear()
		this.previewSizeListeners.clear()
		this.setup.scene.remove(this.mesh, this.pivotMarker)
		if (this.uvPreview) this.setup.scene.remove(this.uvPreview.group)
		this.mesh.geometry.dispose()
		this.material.dispose()
		this.pivotMarker.geometry.dispose()
		const pivotMarkerMaterials = Array.isArray(this.pivotMarker.material)
			? this.pivotMarker.material
			: [this.pivotMarker.material]
		for (const material of pivotMarkerMaterials) material.dispose()
		this.checkerTexture.dispose()
		this.uvPreview?.dispose()
		this.setup.dispose()
	}

	private readonly handleViewHelperClick = (event: PointerEvent): void => {
		if (!this.viewHelper.handleClick(event)) return
		event.preventDefault()
		event.stopImmediatePropagation()
	}

	private readonly handlePointerLeave = (): void => {
		this.updatePivotAnchorHover(null)
		this.updateStretchBoundaryHover(null)
	}

	private applyStretchPreview(): void {
		this.stretchService.deformGeometry(
			this.mesh.geometry,
			this.sourcePositions,
			this.sourceUvs,
			this.stretchAxes,
			this.texelSizeRatio,
			this.sourceSize,
			this.previewSize
		)
		this.uvPreview?.update(this.mesh.geometry)
		this.updateMeshPivotOffset()
	}

	private rebuildEditingGizmos(): void {
		this.clearEditingGizmos()
		if (this.pivotEditingMode === 'bounds') {
			this.createPivotAnchorGizmo()
			if (this.pivotFineTuneEnabled) this.createPivotMoveGizmo()
			return
		}
		if (this.activeStretchAxis) {
			const stretchAxis = this.stretchAxes.find((item) => item.axis === this.activeStretchAxis)
			if (!stretchAxis) return
			this.createEditOverlay(stretchAxis)
			stretchAxis.boxes.forEach((_, boxIndex) => this.createStretchBoxWidget(stretchAxis, boxIndex))
			return
		}
		if (this.scaleToolActive && this.stretchAxes.length > 0) this.createScaleGizmo()
	}

	private createPivotMoveGizmo(): void {
		const target = new Group()
		target.position.set(this.pivot.x, this.pivot.y, this.pivot.z)
		this.setup.scene.add(target)

		const control = new TransformControls(this.setup.camera, this.setup.renderer.domElement)
		control.setMode('translate')
		control.setSpace('world')
		control.setSize(0.8)
		control.attach(target)
		this.setup.scene.add(control.getHelper())
		control.addEventListener('objectChange', () => {
			this.pivot = new ModelPivot(
				round(target.position.x),
				round(target.position.y),
				round(target.position.z)
			)
			this.pivotMarker.position.copy(target.position)
			this.updateMeshPivotOffset()
		})
		control.addEventListener('mouseUp', () => this.publishPivotWidgetInteraction())
		control.addEventListener('dragging-changed', (event) => {
			this.setup.controls.enabled = !Boolean(event.value)
		})
		this.pivotMoveGizmo = { control, target }
	}

	private createPivotAnchorGizmo(): void {
		const coordinates = {
			x: pivotAnchorCoordinates(this.sourceBounds.min.x, this.sourceBounds.max.x),
			y: pivotAnchorCoordinates(this.sourceBounds.min.y, this.sourceBounds.max.y),
			z: pivotAnchorCoordinates(this.sourceBounds.min.z, this.sourceBounds.max.z),
		}
		const diagonal = this.sourceSize.length()
		const markerGeometry = new SphereGeometry(Math.max(diagonal / 100, 0.012), 16, 12)
		const colliderGeometry = new SphereGeometry(Math.max(diagonal / 80, 0.015) * 2.75, 12, 8)
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
						new MeshBasicMaterial({ color: pivotAnchorColor(methods), depthTest: false })
					)
					marker.position.set(x.value, y.value, z.value)
					marker.renderOrder = 1_000
					const collider = new Mesh(colliderGeometry, colliderMaterial)
					collider.position.copy(marker.position)
					collider.renderOrder = 1_001
					collider.userData.interactionTarget = new InteractionTarget(
						`pivot-anchor:${x.method}:${y.method}:${z.method}`,
						PIVOT_ANCHOR_INTERACTION_TARGET,
						new ModelPivot(round(x.value), round(y.value), round(z.value))
					)
					collider.userData.pivotAnchorMarker = marker
					this.setup.scene.add(marker, collider)
					this.pivotAnchorMarkers.push(marker)
					this.pivotAnchorHitTargets.push(collider)
					this.cameraWidgetRadii.set(marker, Math.max(diagonal / 100, 0.012))
					this.cameraWidgetRadii.set(collider, Math.max(diagonal / 80, 0.015) * 2.75)
				}
			}
		}
		this.updateCameraScaledWidgets()
	}

	private createStretchBoxWidget(stretchAxis: ModelStretchAxis, boxIndex: number): void {
		const box = stretchAxis.boxes[boxIndex]
		const center = this.sourceBounds.getCenter(new Vector3())
		const planes: Mesh[] = []
		const handles: Mesh[] = []
		const colliders: Mesh[] = []
		for (const boundary of ['min', 'max'] satisfies StretchBoundary[]) {
			const target = new StretchBoundaryTarget(stretchAxis.axis, boxIndex, boundary)
			const plane = this.createStretchBoundaryPlane(stretchAxis.axis)
			const marker = this.createStretchBoundarySphere(stretchAxis.axis, false)
			const collider = this.createStretchBoundarySphere(stretchAxis.axis, true)
			plane.position.copy(center)
			marker.position.copy(center)
			collider.position.copy(center)
			plane.position[stretchAxis.axis] = box[boundary]
			marker.position[stretchAxis.axis] = box[boundary]
			collider.position[stretchAxis.axis] = box[boundary]
			collider.userData.interactionTarget = new InteractionTarget(
				`stretch-boundary:${stretchAxis.axis}:${boxIndex}:${boundary}`,
				STRETCH_BOUNDARY_INTERACTION_TARGET,
				target
			)
			collider.userData.stretchBoundaryMarker = marker
			this.setup.scene.add(plane, marker, collider)
			planes.push(plane)
			handles.push(marker)
			colliders.push(collider)
			this.stretchBoundaryHitTargets.push(collider)
		}
		this.stretchBoxWidgets.push({ axis: stretchAxis.axis, boxIndex, planes, handles, colliders })
		this.updateCameraScaledWidgets()
	}

	private createStretchBoundaryPlane(axis: ModelGeometryAxis): Mesh {
		const size = this.sourceBounds.getSize(new Vector3())
		const margin = STRETCH_PLANE_PERPENDICULAR_MARGIN * 2
		const geometry = axis === 'x'
			? new PlaneGeometry(size.z + margin, size.y + margin)
			: axis === 'y'
				? new PlaneGeometry(size.x + margin, size.z + margin)
				: new PlaneGeometry(size.x + margin, size.y + margin)
		const plane = new Mesh(
			geometry,
			new MeshBasicMaterial({
				color: AXIS_COLORS[axis],
				opacity: 0.18,
				transparent: true,
				depthTest: false,
				depthWrite: false,
				side: DoubleSide,
			})
		)
		if (axis === 'x') plane.rotation.y = Math.PI / 2
		if (axis === 'y') plane.rotation.x = Math.PI / 2
		plane.renderOrder = 900
		return plane
	}

	private createStretchBoundarySphere(axis: ModelGeometryAxis, collider: boolean): Mesh {
		const sourceRadius = Math.max(this.sourceSize.length() / 100, 0.012)
		const mesh = new Mesh(
			new SphereGeometry(sourceRadius, 16, 12),
			collider
				? new MeshBasicMaterial({
					colorWrite: false,
					depthTest: false,
					transparent: true,
					opacity: 0,
					side: DoubleSide,
				})
				: new MeshBasicMaterial({
					color: AXIS_COLORS[axis],
					depthTest: false,
					depthWrite: false,
					side: DoubleSide,
				})
		)
		mesh.renderOrder = collider ? 1_002 : 1_001
		mesh.userData.widgetPixelRadius = collider ? 28 : 5
		this.cameraWidgetRadii.set(mesh, sourceRadius)
		return mesh
	}

	private createScaleGizmo(): void {
		const target = new Group()
		target.position.set(this.pivot.x, this.pivot.y, this.pivot.z)
		for (const axis of GEOMETRY_AXES) {
			target.scale[axis] = this.previewSize[axis] / this.sourceSize[axis]
		}
		this.setup.scene.add(target)

		const control = new TransformControls(this.setup.camera, this.setup.renderer.domElement)
		control.setMode('scale')
		control.setSpace('world')
		control.setSize(0.8)
		control.showX = this.stretchAxes.some((item) => item.axis === 'x')
		control.showY = this.stretchAxes.some((item) => item.axis === 'y')
		control.showZ = this.stretchAxes.some((item) => item.axis === 'z')
		control.attach(target)
		this.setup.scene.add(control.getHelper())

		control.addEventListener('objectChange', () => {
			const changedSizes: Array<[ModelGeometryAxis, number]> = []
			for (const stretchAxis of this.stretchAxes) {
				const axis = stretchAxis.axis
				const constraint = createModelStretchSizeConstraint(this.modelSize[axis], stretchAxis)
				const size = constraint.constrain(this.sourceSize[axis] * target.scale[axis])
				target.scale[axis] = size / this.sourceSize[axis]
				if (size === this.previewSize[axis]) continue
				this.previewSize[axis] = size
				changedSizes.push([axis, size])
			}
			this.applyStretchPreview()
			for (const [axis, size] of changedSizes) {
				for (const listener of this.previewSizeListeners) listener(axis, size)
			}
		})
		control.addEventListener('dragging-changed', (event) => {
			this.setup.controls.enabled = !Boolean(event.value)
		})
		this.stretchGizmos.push({ control, target })
	}

	private createEditOverlay(stretchAxis: ModelStretchAxis): void {
		const wireframe = new Mesh(
			this.mesh.geometry,
			new MeshBasicMaterial({
				color: EDIT_OVERLAY_COLOR,
				wireframe: true,
				depthTest: false,
				depthWrite: false,
			})
		)
		const vertices = new Points(
			this.mesh.geometry,
			new PointsMaterial({
				color: EDIT_OVERLAY_COLOR,
				size: 3,
				sizeAttenuation: false,
				depthTest: false,
				depthWrite: false,
			})
		)
		wireframe.renderOrder = 1_000
		vertices.renderOrder = 1_001
		const affected = stretchAxis.boxes.map((_, boxIndex) => (
			this.createStretchAffectedOverlay(stretchAxis, boxIndex)
		))
		this.setup.renderer.localClippingEnabled = true
		this.setup.scene.add(...affected.map((overlay) => overlay.mesh), wireframe, vertices)
		this.editOverlay = { wireframe, vertices, affected }
	}

	private createStretchAffectedOverlay(
		stretchAxis: ModelStretchAxis,
		boxIndex: number
	): StretchAffectedOverlay {
		const minimumPlane = new Plane()
		const maximumPlane = new Plane()
		const mesh = new Mesh(
			this.mesh.geometry,
			new MeshBasicMaterial({
				color: AXIS_COLORS[stretchAxis.axis],
				opacity: 0.55,
				transparent: true,
				depthTest: false,
				depthWrite: false,
				side: DoubleSide,
				clippingPlanes: [minimumPlane, maximumPlane],
			})
		)
		mesh.renderOrder = 999
		const overlay = { axis: stretchAxis.axis, boxIndex, mesh, minimumPlane, maximumPlane }
		this.updateStretchAffectedOverlay(overlay, stretchAxis)
		return overlay
	}

	private updateStretchAffectedOverlay(
		overlay: StretchAffectedOverlay,
		stretchAxis: ModelStretchAxis
	): void {
		const box = stretchAxis.boxes[overlay.boxIndex]
		if (!box) {
			throw new Error(
				`Cannot update affected mesh overlay for missing ${overlay.axis.toUpperCase()} stretch box `
				+ `${overlay.boxIndex}; the axis contains ${stretchAxis.boxes.length} box(es).`
			)
		}
		const direction = axisVector(overlay.axis)
		const positionOffset = this.mesh.position[overlay.axis]
		overlay.minimumPlane.set(direction, -(box.min + positionOffset))
		overlay.maximumPlane.set(direction.negate(), box.max + positionOffset)
		overlay.mesh.position.copy(this.mesh.position)
	}

	private synchronizeScaleTarget(): void {
		if (!this.scaleToolActive || this.activeStretchAxis || this.stretchGizmos.length !== 1) return
		const target = this.stretchGizmos[0].target
		target.position.set(this.pivot.x, this.pivot.y, this.pivot.z)
		for (const axis of GEOMETRY_AXES) {
			target.scale[axis] = this.previewSize[axis] / this.sourceSize[axis]
		}
	}

	private updateMeshPivotOffset(): void {
		const stretchedBounds = this.mesh.geometry.boundingBox
		if (!stretchedBounds) {
			throw new Error('Cannot place the stretch preview because its deformed geometry has no bounding box.')
		}
		this.mesh.position.copy(this.stretchService.getPivotOffset(
			this.sourceBounds,
			stretchedBounds,
			this.sourceSize,
			this.previewSize,
			this.pivot
		))
		if (this.editOverlay) {
			this.editOverlay.wireframe.position.copy(this.mesh.position)
			this.editOverlay.vertices.position.copy(this.mesh.position)
			for (const overlay of this.editOverlay.affected) {
				this.updateStretchAffectedOverlay(overlay, this.requireStretchAxis(overlay.axis))
			}
		}
	}

	private publishPivotWidgetInteraction(): void {
		const interaction = new WidgetInteraction(
			'widget-commit',
			new InteractionTarget('model-pivot', PIVOT_INTERACTION_TARGET, this.pivot),
			0,
			0,
			new Event('model-pivot-widget-commit')
		)
		for (const listener of this.widgetInteractionListeners) listener(interaction)
	}

	private publishStretchWidgetInteraction(
		type: WidgetEventType,
		stretchAxis: ModelStretchAxis,
		boxIndex: number,
		boundary: StretchBoundary
	): void {
		const interaction = new WidgetInteraction(
			type,
			new InteractionTarget(
				`stretch-axis:${stretchAxis.axis}:${boxIndex}:${boundary}`,
				STRETCH_AXIS_INTERACTION_TARGET,
				stretchAxis
			),
			0,
			0,
			new Event(`model-stretch-axis-${type}`)
		)
		for (const listener of this.widgetInteractionListeners) listener(interaction)
	}

	private clampBoundary(
		stretchAxis: ModelStretchAxis,
		boxIndex: number,
		boundary: StretchBoundary,
		value: number
	): number {
		const fullSpan = this.sourceBounds.max[stretchAxis.axis] - this.sourceBounds.min[stretchAxis.axis]
		const minimumGap = getMinimumStretchBoxLength(fullSpan)
		const box = stretchAxis.boxes[boxIndex]
		if (!box) {
			throw new Error(
				`Cannot clamp missing ${stretchAxis.axis.toUpperCase()} stretch box ${boxIndex}; `
				+ `the axis contains ${stretchAxis.boxes.length} box(es).`
			)
		}
		if (boundary === 'min') {
			const previousMax = stretchAxis.boxes[boxIndex - 1]?.max ?? -Infinity
			return roundStretchBoxValue(Math.max(previousMax, Math.min(value, box.max - minimumGap)))
		}
		const nextMin = stretchAxis.boxes[boxIndex + 1]?.min ?? Infinity
		return roundStretchBoxValue(Math.min(nextMin, Math.max(value, box.min + minimumGap)))
	}

	private requireStretchAxis(axis: ModelGeometryAxis): ModelStretchAxis {
		const stretchAxis = this.stretchAxes.find((candidate) => candidate.axis === axis)
		if (!stretchAxis) {
			throw new Error(
				`Cannot access ${axis.toUpperCase()} stretch axis. Configured axes: `
				+ `${this.stretchAxes.map((candidate) => candidate.axis.toUpperCase()).join(', ') || 'none'}.`
			)
		}
		return stretchAxis
	}

	private intersectPointerPlane(
		x: number,
		y: number,
		plane: Plane,
		target: StretchBoundaryTarget
	): Vector3 {
		const bounds = this.setup.renderer.domElement.getBoundingClientRect()
		this.raycaster.setFromCamera(new Vector2(
			(x / bounds.width) * 2 - 1,
			-(y / bounds.height) * 2 + 1
		), this.setup.camera)
		const intersection = this.raycaster.ray.intersectPlane(plane, new Vector3())
		if (!intersection) {
			throw new Error(
				`Cannot resolve pointer (${x}, ${y}) while dragging ${target.axis.toUpperCase()} stretch box `
				+ `${target.boxIndex} ${target.boundary} face. Viewport: ${bounds.width}×${bounds.height}.`
			)
		}
		return intersection
	}

	private updateStretchBoxWidget(stretchAxis: ModelStretchAxis, boxIndex: number): void {
		const widget = this.stretchBoxWidgets.find(
			(candidate) => candidate.axis === stretchAxis.axis && candidate.boxIndex === boxIndex
		)
		const box = stretchAxis.boxes[boxIndex]
		if (!widget || !box) {
			throw new Error(
				`Cannot update ${stretchAxis.axis.toUpperCase()} stretch box widget ${boxIndex}. `
				+ `Widget found: ${Boolean(widget)}; box found: ${Boolean(box)}.`
			)
		}
		widget.planes[0].position[stretchAxis.axis] = box.min
		widget.planes[1].position[stretchAxis.axis] = box.max
		widget.handles[0].position[stretchAxis.axis] = box.min
		widget.handles[1].position[stretchAxis.axis] = box.max
		widget.colliders[0].position[stretchAxis.axis] = box.min
		widget.colliders[1].position[stretchAxis.axis] = box.max
		const overlay = this.editOverlay?.affected.find(
			(candidate) => candidate.axis === stretchAxis.axis && candidate.boxIndex === boxIndex
		)
		if (!overlay) {
			throw new Error(
				`Cannot update affected mesh overlay for ${stretchAxis.axis.toUpperCase()} stretch box `
				+ `${boxIndex}; no matching overlay is active.`
			)
		}
		this.updateStretchAffectedOverlay(overlay, stretchAxis)
	}

	private updatePivotAnchorHover(hitTarget: Object3D | null): void {
		const marker = hitTarget?.userData.pivotAnchorMarker as Mesh | undefined
		if (marker === this.hoveredPivotAnchor) return
		if (this.hoveredPivotAnchor) {
			const material = this.hoveredPivotAnchor.material as MeshBasicMaterial
			material.color.setHex(this.hoveredPivotAnchor.userData.baseColor as number)
		}
		this.hoveredPivotAnchor = marker ?? null
		this.setup.renderer.domElement.style.cursor = marker
			? 'pointer'
			: this.hoveredStretchBoundary ? 'grab' : ''
		if (!marker) return
		const material = marker.material as MeshBasicMaterial
		marker.userData.baseColor = material.color.getHex()
		material.color.setHex(0xffffff)
	}

	private updateStretchBoundaryHover(hitTarget: Object3D | null): void {
		const marker = hitTarget?.userData.stretchBoundaryMarker as Mesh | undefined
		if (marker === this.hoveredStretchBoundary) return
		if (this.hoveredStretchBoundary) {
			const material = this.hoveredStretchBoundary.material as MeshBasicMaterial
			material.color.setHex(this.hoveredStretchBoundary.userData.baseColor as number)
		}
		this.hoveredStretchBoundary = marker ?? null
		this.setup.renderer.domElement.style.cursor = marker
			? 'grab'
			: this.hoveredPivotAnchor ? 'pointer' : ''
		if (!marker) return
		const material = marker.material as MeshBasicMaterial
		marker.userData.baseColor = material.color.getHex()
		material.color.setHex(0xffffff)
	}

	private clearEditingGizmos(): void {
		this.activeStretchBoundaryDrag = null
		if (this.stretchBoxWidgets.length > 0) {
			this.updateStretchBoundaryHover(null)
			for (const widget of this.stretchBoxWidgets) {
				this.setup.scene.remove(...widget.planes, ...widget.handles, ...widget.colliders)
				for (const handle of [...widget.planes, ...widget.handles, ...widget.colliders]) {
					this.cameraWidgetRadii.delete(handle)
					handle.geometry.dispose()
					const materials = Array.isArray(handle.material) ? handle.material : [handle.material]
					for (const material of materials) material.dispose()
				}
			}
			this.stretchBoxWidgets = []
			this.stretchBoundaryHitTargets = []
		}
		if (this.pivotMoveGizmo) {
			const { control, target } = this.pivotMoveGizmo
			control.detach()
			this.setup.scene.remove(control.getHelper(), target)
			control.dispose()
			this.pivotMoveGizmo = null
		}
		if (this.pivotAnchorHitTargets.length > 0) {
			this.updatePivotAnchorHover(null)
			const colliderGeometry = this.pivotAnchorHitTargets[0].geometry
			const colliderMaterial = this.pivotAnchorHitTargets[0].material
			const markerGeometry = this.pivotAnchorMarkers[0].geometry
			for (const target of this.pivotAnchorHitTargets) {
				this.setup.scene.remove(target)
				this.cameraWidgetRadii.delete(target)
			}
			for (const marker of this.pivotAnchorMarkers) {
				this.setup.scene.remove(marker)
				this.cameraWidgetRadii.delete(marker)
				const materials = Array.isArray(marker.material) ? marker.material : [marker.material]
				for (const material of materials) material.dispose()
			}
			colliderGeometry.dispose()
			markerGeometry.dispose()
			const colliderMaterials = Array.isArray(colliderMaterial) ? colliderMaterial : [colliderMaterial]
			for (const material of colliderMaterials) material.dispose()
			this.pivotAnchorHitTargets = []
			this.pivotAnchorMarkers = []
		}
		for (const { control, target } of this.stretchGizmos) {
			control.detach()
			this.setup.scene.remove(control.getHelper(), target)
			control.dispose()
			for (const child of target.children) {
				if (!(child instanceof Mesh)) continue
				child.geometry.dispose()
				const materials = Array.isArray(child.material) ? child.material : [child.material]
				for (const material of materials) material.dispose()
			}
		}
		this.stretchGizmos = []
		if (this.editOverlay) {
			this.setup.scene.remove(
				this.editOverlay.wireframe,
				this.editOverlay.vertices,
				...this.editOverlay.affected.map((overlay) => overlay.mesh)
			)
			const wireframeMaterial = this.editOverlay.wireframe.material
			const vertexMaterial = this.editOverlay.vertices.material
			if (Array.isArray(wireframeMaterial)) {
				for (const material of wireframeMaterial) material.dispose()
			} else wireframeMaterial.dispose()
			if (Array.isArray(vertexMaterial)) {
				for (const material of vertexMaterial) material.dispose()
			} else vertexMaterial.dispose()
			for (const overlay of this.editOverlay.affected) {
				const materials = Array.isArray(overlay.mesh.material)
					? overlay.mesh.material
					: [overlay.mesh.material]
				for (const material of materials) material.dispose()
			}
			this.editOverlay = null
			this.setup.renderer.localClippingEnabled = false
		}
		this.setup.controls.enabled = true
	}

	private updateCameraScaledWidgets(): void {
		const viewportHeight = this.setup.renderer.domElement.clientHeight
		if (viewportHeight === 0) return
		for (const [widget, radius] of this.cameraWidgetRadii) {
			const pixelRadius = widget.userData.widgetPixelRadius as number | undefined
				?? (this.pivotAnchorHitTargets.includes(widget) ? 28 : 5)
			const distance = this.setup.camera.position.distanceTo(widget.getWorldPosition(new Vector3()))
			const worldRadius = 2 * distance * Math.tan(MathUtils.degToRad(this.setup.camera.fov / 2))
				* pixelRadius / viewportHeight
			widget.scale.setScalar(worldRadius / radius)
		}
	}

	private fitCamera(modelId: string): void {
		if (this.sourceBounds.isEmpty()) {
			throw new Error(`Cannot frame model "${modelId}" because its loaded geometry has empty bounds.`)
		}
		const center = this.sourceBounds.getCenter(new Vector3())
		const size = this.sourceBounds.getSize(new Vector3())
		const radius = size.length() / 2
		if (!Number.isFinite(radius) || radius <= 0) {
			throw new Error(
				`Cannot frame model "${modelId}" because its bounding-box diagonal produced radius ${radius}. `
				+ `Bounds size: ${JSON.stringify({ x: size.x, y: size.y, z: size.z })}.`
			)
		}

		const halfFov = MathUtils.degToRad(this.setup.camera.fov / 2)
		const distance = (radius / Math.sin(halfFov)) * 1.25
		const direction = new Vector3(1, 0.75, 1).normalize()
		this.setup.camera.position.copy(center).addScaledVector(direction, distance)
		this.setup.camera.near = Math.max(radius / 1_000, 0.001)
		this.setup.camera.far = distance + radius * 20
		this.setup.camera.updateProjectionMatrix()
		this.setup.controls.target.copy(center)
		this.setup.controls.minDistance = radius * 0.1
		this.setup.controls.maxDistance = radius * 20
		this.setup.controls.update()
	}
}

function pivotAnchorCoordinates(
	min: number,
	max: number
): Array<{ value: number; method: PivotAnchorMethod }> {
	return [
		{ value: min, method: 'min' },
		{ value: (min + max) / 2, method: 'middle' },
		{ value: max, method: 'max' },
	]
}

function axisVector(axis: ModelGeometryAxis): Vector3 {
	if (axis === 'x') return new Vector3(1, 0, 0)
	if (axis === 'y') return new Vector3(0, 1, 0)
	return new Vector3(0, 0, 1)
}

function pivotAnchorColor(
	methods: Record<ModelGeometryAxis, PivotAnchorMethod>
): number {
	const middleCount = Object.values(methods).filter((method) => method === 'middle').length
	if (middleCount === 0) return 0xef4444
	if (middleCount === 1) return 0xf59e0b
	if (middleCount === 2) return 0x3b82f6
	return 0xa3e635
}

function round(value: number): number {
	return Number(value.toFixed(6))
}
