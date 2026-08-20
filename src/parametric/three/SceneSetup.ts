import { CameraUpdateController } from '@/parametric/three/CameraUpdateController'
import {
	AmbientLight,
	AxesHelper,
	Box3,
	type Camera,
	Clock,
	Color,
	DirectionalLight,
	GridHelper,
	HemisphereLight,
	PCFSoftShadowMap,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface SceneSetupResult {
	scene: Scene
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	controls: OrbitControls
	cameraUpdates: CameraUpdateController
	addRenderListener: (listener: SceneRenderListener) => AbortController
	setRenderView: (scene: Scene, camera: Camera) => void
	resetRenderView: () => void
	fitShadowsToBounds: (bounds: Box3) => void
	dispose: () => void
}

type SceneRenderListener = (deltaSeconds: number) => void
export type ScenePresentation = 'technical' | 'studio'

export function createSceneSetup(
	canvas: HTMLCanvasElement,
	presentation: ScenePresentation = 'technical'
): SceneSetupResult {
	const scene = new Scene()
	scene.background = new Color(0x1b1d21)

	const camera = new PerspectiveCamera(50, 1, 0.1, 1000)
	camera.position.set(4, 3, 5)

	const renderer = new WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = PCFSoftShadowMap

	const controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
	controls.target.set(0, 0, 0)
	const cameraUpdates = new CameraUpdateController()

	const ambientLight = new AmbientLight(0xffffff, 0.4)
	scene.add(ambientLight)

	const hemisphereLight = new HemisphereLight(0xffffff, 0x444444, 0.4)
	hemisphereLight.position.set(0, 10, 0)
	scene.add(hemisphereLight)

	const directionalLight = new DirectionalLight(0xffffff, 1.0)
	directionalLight.position.set(5, 8, 5)
	directionalLight.castShadow = true
	directionalLight.shadow.mapSize.set(2048, 2048)
	directionalLight.shadow.bias = -0.0001
	directionalLight.shadow.normalBias = 0.02
	directionalLight.shadow.camera.near = 0.1
	scene.add(directionalLight)
	scene.add(directionalLight.target)

	const fitShadowsToBounds = (bounds: Box3) => {
		if (bounds.isEmpty()) return
		const center = bounds.getCenter(new Vector3())
		const size = bounds.getSize(new Vector3())
		const radius = Math.max(size.length() / 2, 0.01)
		const lightDirection = new Vector3(5, 8, 5).normalize()
		const shadowCamera = directionalLight.shadow.camera

		directionalLight.position.copy(center).addScaledVector(lightDirection, radius * 2.5)
		directionalLight.target.position.copy(center)
		shadowCamera.left = -radius * 1.15
		shadowCamera.right = radius * 1.15
		shadowCamera.top = radius * 1.15
		shadowCamera.bottom = -radius * 1.15
		shadowCamera.far = radius * 5
		directionalLight.shadow.normalBias = Math.max(radius * 0.0005, 0.001)
		directionalLight.target.updateMatrixWorld()
		shadowCamera.updateProjectionMatrix()
	}

	if (presentation === 'technical') {
		const gridHelper = new GridHelper(10, 10)
		scene.add(gridHelper)

		const axesHelper = new AxesHelper(2)
		scene.add(axesHelper)
	}

	const clock = new Clock()
	let renderScene: Scene = scene
	let renderCamera: Camera = camera
	const renderListeners = new Set<SceneRenderListener>()
	const addRenderListener = (listener: SceneRenderListener): AbortController => {
		renderListeners.add(listener)
		const registration = new AbortController()
		registration.signal.addEventListener('abort', () => renderListeners.delete(listener), { once: true })
		return registration
	}

	let animationFrame = 0
	const animate = () => {
		const deltaSeconds = clock.getDelta()
		controls.update()
		cameraUpdates.notify()
		renderer.render(renderScene, renderCamera)
		for (const listener of renderListeners) listener(deltaSeconds)
		animationFrame = requestAnimationFrame(animate)
	}
	animate()

	const dispose = () => {
		cancelAnimationFrame(animationFrame)
		renderListeners.clear()
		controls.dispose()
		renderer.dispose()
	}
	const setRenderView = (nextScene: Scene, nextCamera: Camera) => {
		renderScene = nextScene
		renderCamera = nextCamera
	}
	const resetRenderView = () => {
		renderScene = scene
		renderCamera = camera
	}

	return {
		scene,
		camera,
		renderer,
		controls,
		cameraUpdates,
		addRenderListener,
		setRenderView,
		resetRenderView,
		fitShadowsToBounds,
		dispose,
	}
}
