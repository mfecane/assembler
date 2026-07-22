import {
	AmbientLight,
	AxesHelper,
	Color,
	DirectionalLight,
	GridHelper,
	HemisphereLight,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface SceneSetupResult {
	scene: Scene
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	controls: OrbitControls
	dispose: () => void
}

export function createSceneSetup(canvas: HTMLCanvasElement): SceneSetupResult {
	const scene = new Scene()
	scene.background = new Color(0x1b1d21)

	const camera = new PerspectiveCamera(50, 1, 0.1, 100)
	camera.position.set(4, 3, 5)

	const renderer = new WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.shadowMap.enabled = true

	const controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
	controls.target.set(0, 0, 0)

	const ambientLight = new AmbientLight(0xffffff, 0.4)
	scene.add(ambientLight)

	const hemisphereLight = new HemisphereLight(0xffffff, 0x444444, 0.6)
	hemisphereLight.position.set(0, 10, 0)
	scene.add(hemisphereLight)

	const directionalLight = new DirectionalLight(0xffffff, 1)
	directionalLight.position.set(5, 8, 5)
	directionalLight.castShadow = true
	scene.add(directionalLight)

	const gridHelper = new GridHelper(10, 10)
	scene.add(gridHelper)

	const axesHelper = new AxesHelper(2)
	scene.add(axesHelper)

	let animationFrame = 0
	const animate = () => {
		controls.update()
		renderer.render(scene, camera)
		animationFrame = requestAnimationFrame(animate)
	}
	animate()

	const dispose = () => {
		cancelAnimationFrame(animationFrame)
		controls.dispose()
		renderer.dispose()
	}

	return { scene, camera, renderer, controls, dispose }
}
