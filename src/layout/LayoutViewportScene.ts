import { SCENE_CONSTANTS } from '@/constants'
import type { LayoutWorldSlot } from '@/layout/LayoutEvaluator'
import { LayoutFloor } from '@/layout/LayoutFloor'
import type { SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import { emptySceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import { createSceneSetup } from '@/parametric/three/SceneSetup'
import { syncSceneMetadata } from '@/parametric/three/syncMeshes'
import {
	Box3,
	EquirectangularReflectionMapping,
	Matrix4,
	Mesh,
	PlaneGeometry,
	SRGBColorSpace,
	ShaderMaterial,
	ShadowMaterial,
	TextureLoader,
	Vector3,
	type PerspectiveCamera,
	type Scene,
	type Texture,
	type WebGLRenderer,
} from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import studioEnvironmentUrl from '../../assets/environment/blocky_photo_studio_512.ktx2?url'
import catUrl from '../../assets/textures/cat.png?url'

export interface LayoutSlotScreenPosition {
	id: string
	index: number
	x: number
	y: number
	visible: boolean
}

type SlotPositionListener = (slots: LayoutSlotScreenPosition[]) => void

export class LayoutViewportScene {
	private readonly scene: Scene
	private readonly meshesById = new Map<string, Mesh>()
	private readonly disposeSetup: () => void
	private readonly cameraUpdateSubscription: AbortController
	private readonly animationRenderSubscription: AbortController
	private readonly fitShadowsToBounds: (bounds: Box3) => void
	private readonly camera: PerspectiveCamera
	private readonly renderer: WebGLRenderer
	private readonly listeners = new Set<SlotPositionListener>()
	private readonly floor: LayoutFloor
	private readonly floorShadow: Mesh<PlaneGeometry, ShadowMaterial>
	private readonly cat: Mesh<PlaneGeometry, ShaderMaterial>
	private readonly catTexture: Texture
	private readonly environmentLoader: KTX2Loader
	private environment: Texture | null = null
	private disposed = false
	private addSlot: LayoutWorldSlot | null = null
	private screenSlots: LayoutSlotScreenPosition[] = []
	private doorAnimationProgress = 0
	private doorAnimationTarget = 0

	public constructor(
		canvas: HTMLCanvasElement,
		private readonly container: HTMLElement
	) {
		const setup = createSceneSetup(canvas)
		this.scene = setup.scene
		this.disposeSetup = setup.dispose
		this.fitShadowsToBounds = setup.fitShadowsToBounds
		this.cameraUpdateSubscription = setup.cameraUpdates.subscribe(() => {
			this.updateScreenSlots(setup.camera)
		})
		this.camera = setup.camera
		this.renderer = setup.renderer
		this.animationRenderSubscription = setup.addRenderListener((deltaSeconds) => {
			this.updateDoorAnimation(deltaSeconds)
		})
		setup.controls.maxPolarAngle = Math.PI / 2 - 0.05

		this.floor = new LayoutFloor()
		this.floorShadow = new Mesh(
			new PlaneGeometry(100, 100),
			new ShadowMaterial({ opacity: 0.18, transparent: true })
		)
		this.floorShadow.rotation.x = -Math.PI / 2
		this.floorShadow.position.y = 0.002
		this.floorShadow.receiveShadow = true
		const catMaterial = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: { map: { value: null } },
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					vec3 worldCenter = modelMatrix[3].xyz;
					vec3 cameraDirection = cameraPosition - worldCenter;
					cameraDirection.y = 0.0;
					if (length(cameraDirection) < 0.0001) cameraDirection = vec3(0.0, 0.0, 1.0);
					vec3 horizontalRight = normalize(cross(vec3(0.0, 1.0, 0.0), cameraDirection));
					float width = length(modelMatrix[0].xyz);
					float height = length(modelMatrix[1].xyz);
					vec3 worldPosition = worldCenter
						+ horizontalRight * position.x * width
						+ vec3(0.0, position.y * height, 0.0);
					gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D map;
				varying vec2 vUv;
				void main() {
					vec4 color = texture2D(map, vUv);
					if (color.a < 0.01) discard;
					gl_FragColor = color;
					#include <tonemapping_fragment>
					#include <colorspace_fragment>
				}
			`,
		})
		// TODO reduce texture size
		this.cat = new Mesh(new PlaneGeometry(1, 1), catMaterial)
		this.cat.renderOrder = 1
		this.cat.visible = false
		this.cat.scale.set(SCENE_CONSTANTS.CAT_HEIGHT * SCENE_CONSTANTS.CAT_ASPECT_RATIO, SCENE_CONSTANTS.CAT_HEIGHT, 1)
		this.catTexture = new TextureLoader().load(
			catUrl,
			(texture) => {
				if (this.disposed) texture.dispose()
			},
			undefined,
			(cause) =>
				console.error(
					`Failed to load Product Editor scale-reference sprite from "${catUrl}". ` +
						'The active assembly will render without the cat scale reference.',
					{ cause, textureUrl: catUrl }
				)
		)
		this.catTexture.colorSpace = SRGBColorSpace
		catMaterial.uniforms.map.value = this.catTexture
		this.scene.add(this.floor.mesh)
		this.scene.add(this.floorShadow)
		this.scene.add(this.cat)
		this.environmentLoader = new KTX2Loader().detectSupport(this.renderer)
		this.environmentLoader.load(
			studioEnvironmentUrl,
			(texture) => {
				if (this.disposed) {
					texture.dispose()
					return
				}
				texture.mapping = EquirectangularReflectionMapping
				this.environment = texture
				this.scene.background = texture
				// TODO can we visually lighten it?
				this.scene.backgroundBlurriness = SCENE_CONSTANTS.ENVIRONMENT_BACKGROUND_BLURRINESS
				this.scene.backgroundIntensity = SCENE_CONSTANTS.ENVIRONMENT_BACKGROUND_INTENSITY
				this.scene.environment = texture
				this.scene.environmentIntensity = SCENE_CONSTANTS.ENVIRONMENT_INTENSITY
			},
			undefined,
			(cause) =>
				console.error(
					`Failed to load layout studio environment from "${studioEnvironmentUrl}". ` +
						'The layout viewport will retain its solid background and direct lighting.',
					{ cause, environmentUrl: studioEnvironmentUrl }
				)
		)
		this.resize()
	}

	public addOnSlotPositionUpdate(listener: SlotPositionListener): AbortController {
		this.listeners.add(listener)
		listener(this.screenSlots)
		const registration = new AbortController()
		registration.signal.addEventListener('abort', () => this.listeners.delete(listener), { once: true })
		return registration
	}

	public resize(): void {
		const { clientWidth, clientHeight } = this.container
		if (clientWidth === 0 || clientHeight === 0) return
		this.renderer.setSize(clientWidth, clientHeight, false)
		this.camera.aspect = clientWidth / clientHeight
		this.camera.updateProjectionMatrix()
		this.updateScreenSlots(this.camera)
	}

	public sync(metadata: SceneMetadata, addSlot: LayoutWorldSlot | null): void {
		syncSceneMetadata(this.scene, this.meshesById, metadata)
		this.addSlot = addSlot
		const bounds = new Box3()
		for (const mesh of this.meshesById.values()) bounds.expandByObject(mesh)
		this.updateScaleReference(bounds)
		if (!bounds.isEmpty()) this.fitShadowsToBounds(bounds)
		this.updateScreenSlots(this.camera)
	}

	public setDoorsOpen(open: boolean): void {
		this.doorAnimationTarget = open ? 1 : 0
	}

	public dispose(): void {
		this.disposed = true
		this.cameraUpdateSubscription.abort()
		this.animationRenderSubscription.abort()
		this.listeners.clear()
		syncSceneMetadata(this.scene, this.meshesById, emptySceneMetadata())
		this.scene.remove(this.floor.mesh)
		this.scene.remove(this.floorShadow)
		this.scene.remove(this.cat)
		this.floor.dispose()
		this.floorShadow.geometry.dispose()
		this.floorShadow.material.dispose()
		this.cat.geometry.dispose()
		this.cat.material.dispose()
		this.catTexture.dispose()
		this.environment?.dispose()
		this.environmentLoader.dispose()
		this.disposeSetup()
	}

	private updateScreenSlots(camera: typeof this.camera): void {
		const slots = this.addSlot ? [projectSlot(this.addSlot, camera, this.container)] : []
		if (sameScreenSlots(slots, this.screenSlots)) return
		this.screenSlots = slots
		for (const listener of this.listeners) listener(slots)
	}

	private updateScaleReference(bounds: Box3): void {
		this.cat.visible = !bounds.isEmpty()
		if (bounds.isEmpty()) return
		this.cat.position.set(
			bounds.min.x,
			bounds.min.y + SCENE_CONSTANTS.CAT_HEIGHT / 2,
			bounds.max.z + SCENE_CONSTANTS.CAT_FRONT_OFFSET
		)
	}

	private updateDoorAnimation(deltaSeconds: number): void {
		const distance = this.doorAnimationTarget - this.doorAnimationProgress
		if (distance !== 0) {
			const step = deltaSeconds / 0.35
			this.doorAnimationProgress += Math.sign(distance) * Math.min(Math.abs(distance), step)
		}
		for (const mesh of this.meshesById.values()) {
			const metadata = mesh.userData.sceneInstance as SceneMetadata['assetInstances'][number]
			const hint = metadata.rotateAnimationHint
			if (!hint) continue
			const angle = hint.angle * easeOutCubic(this.doorAnimationProgress)
			mesh.matrix.copy(createRotateAnimationMatrix(metadata, hint.pivot, hint.axisDirection, angle))
			mesh.updateMatrixWorld(true)
		}
	}
}

function createRotateAnimationMatrix(
	metadata: SceneMetadata['assetInstances'][number],
	pivot: { x: number; y: number; z: number },
	axisDirection: { x: number; y: number; z: number },
	angle: number
): Matrix4 {
	return new Matrix4()
		.makeTranslation(pivot.x, pivot.y, pivot.z)
		.multiply(
			new Matrix4().makeRotationAxis(
				new Vector3(axisDirection.x, axisDirection.y, axisDirection.z),
				(angle * Math.PI) / 180
			)
		)
		.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))
		.multiply(new Matrix4().fromArray(metadata.transform))
}

function easeOutCubic(value: number): number {
	return 1 - (1 - value) ** 3
}

function projectSlot(
	slot: LayoutWorldSlot,
	camera: PerspectiveCamera,
	container: HTMLElement
): LayoutSlotScreenPosition {
	const projected = new Vector3(slot.position.x, slot.position.y, slot.position.z).project(camera)
	return {
		id: slot.id,
		index: slot.index,
		x: ((projected.x + 1) * container.clientWidth) / 2,
		y: ((1 - projected.y) * container.clientHeight) / 2,
		visible:
			projected.z >= -1 &&
			projected.z <= 1 &&
			projected.x >= -1 &&
			projected.x <= 1 &&
			projected.y >= -1 &&
			projected.y <= 1,
	}
}

function sameScreenSlots(left: LayoutSlotScreenPosition[], right: LayoutSlotScreenPosition[]): boolean {
	return (
		left.length === right.length &&
		left.every((slot, index) => {
			const candidate = right[index]
			return (
				candidate?.id === slot.id &&
				candidate.visible === slot.visible &&
				Math.abs(candidate.x - slot.x) < 0.25 &&
				Math.abs(candidate.y - slot.y) < 0.25
			)
		})
	)
}
