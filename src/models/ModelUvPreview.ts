import {
	BufferGeometry,
	Color,
	Float32BufferAttribute,
	GridHelper,
	LineBasicMaterial,
	LineSegments,
	OrthographicCamera,
	Scene,
	WireframeGeometry,
} from 'three'

export class ModelUvPreview {
	public readonly scene = new Scene()
	public readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
	private readonly material = new LineBasicMaterial({ color: 0xf8fafc })
	private wireframe: LineSegments | null = null

	public constructor(geometry: BufferGeometry) {
		this.scene.background = new Color(0x1b1d21)
		const grid = new GridHelper(1, 10, 0x64748b, 0x334155)
		grid.rotation.x = Math.PI / 2
		grid.position.set(0.5, 0.5, -0.01)
		this.scene.add(grid)
		this.camera.position.set(0.5, 0.5, 2)
		this.camera.lookAt(0.5, 0.5, 0)
		this.update(geometry)
	}

	public update(geometry: BufferGeometry): void {
		const uv = geometry.getAttribute('uv')
		if (!uv || uv.itemSize < 2) {
			throw new Error('Cannot draw UV preview because geometry has no two-component UV attribute.')
		}
		const positions = new Float32Array(uv.count * 3)
		for (let vertex = 0; vertex < uv.count; vertex += 1) {
			const u = uv.getX(vertex)
			const v = uv.getY(vertex)
			if (!Number.isFinite(u) || !Number.isFinite(v)) {
				throw new Error(`Cannot draw UV preview because vertex ${vertex} has UV (${u}, ${v}).`)
			}
			positions[vertex * 3] = u
			positions[vertex * 3 + 1] = v
		}

		const uvGeometry = new BufferGeometry()
		uvGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
		if (geometry.index) uvGeometry.setIndex(geometry.index.clone())
		const wireframeGeometry = new WireframeGeometry(uvGeometry)
		uvGeometry.dispose()
		if (this.wireframe) {
			this.scene.remove(this.wireframe)
			this.wireframe.geometry.dispose()
		}
		this.wireframe = new LineSegments(wireframeGeometry, this.material)
		this.scene.add(this.wireframe)
	}

	public resize(width: number, height: number): void {
		if (width <= 0 || height <= 0) return
		const viewportAspect = width / height
		const halfWidth = viewportAspect > 1 ? viewportAspect / 2 : 0.5
		const halfHeight = viewportAspect > 1 ? 0.5 : 1 / viewportAspect / 2
		this.camera.left = 0.5 - halfWidth
		this.camera.right = 0.5 + halfWidth
		this.camera.top = 0.5 + halfHeight
		this.camera.bottom = 0.5 - halfHeight
		this.camera.updateProjectionMatrix()
	}

	public dispose(): void {
		if (this.wireframe) this.wireframe.geometry.dispose()
		this.material.dispose()
		for (const child of this.scene.children) {
			if (!(child instanceof GridHelper)) continue
			child.geometry.dispose()
			const materials = Array.isArray(child.material) ? child.material : [child.material]
			for (const material of materials) material.dispose()
		}
	}
}
