import {
	BufferGeometry,
	Float32BufferAttribute,
	Group,
	LineBasicMaterial,
	LineSegments,
	WireframeGeometry,
} from 'three'

export class ModelUvPreview {
	public readonly group = new Group()
	private readonly material = new LineBasicMaterial({ color: 0xf8fafc })
	private wireframe: LineSegments | null = null

	public constructor(geometry: BufferGeometry) {
		this.group.visible = false
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
			positions[vertex * 3 + 2] = v
		}

		const uvGeometry = new BufferGeometry()
		uvGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
		if (geometry.index) uvGeometry.setIndex(geometry.index.clone())
		const wireframeGeometry = new WireframeGeometry(uvGeometry)
		uvGeometry.dispose()
		if (this.wireframe) {
			this.group.remove(this.wireframe)
			this.wireframe.geometry.dispose()
		}
		this.wireframe = new LineSegments(wireframeGeometry, this.material)
		this.group.add(this.wireframe)
	}

	public dispose(): void {
		if (this.wireframe) this.wireframe.geometry.dispose()
		this.material.dispose()
	}
}
