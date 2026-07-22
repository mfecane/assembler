import type { BufferGeometry } from 'three'

export interface MeshDescriptor {
	id: string
	label: string
	selectable: boolean
}

export interface MeshBounds {
	x: number
	y: number
	z: number
	center: {
		x: number
		y: number
		z: number
	}
}

export interface MeshCatalog {
	getMeshes(): readonly MeshDescriptor[]
	getBounds(id: string): MeshBounds | undefined
	createGeometry(id: string): BufferGeometry | undefined
}
