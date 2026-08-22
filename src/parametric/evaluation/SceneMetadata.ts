import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface SceneStretchAxisMetadata {
	axis: 'x' | 'y' | 'z'
	boxes: Array<{ min: number; max: number }>
	textureAxis: 'u' | 'v' | null
}

export interface SceneStretchDeformationMetadata {
	kind: 'stretch'
	sourceSize: Vector3Snapshot
	pivot: Vector3Snapshot
	texelSizeRatio: number
	axes: SceneStretchAxisMetadata[]
}

export type Matrix4Snapshot = readonly [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
]

export interface SceneNodeInstanceReference {
	graphId: string
	nodeId: string
	nodeInstanceId: string
}

export interface SceneMaterialMetadata {
	materialId: string
	color?: string
}

export interface SceneAxisAlignedBoundsMetadata {
	min: Vector3Snapshot
	max: Vector3Snapshot
}

export interface SceneRotateAnimationHint {
	angle: number
	axisPosition: {
		x: 'min' | 'middle' | 'max'
		y: 'min' | 'middle' | 'max'
		z: 'min' | 'middle' | 'max'
	}
	pivot: Vector3Snapshot
	axisDirection: Vector3Snapshot
}

export interface SceneAssetInstanceMetadata {
	instanceId: string
	assetId: string
	assetKind: 'catalog' | 'primitive'
	size: Vector3Snapshot
	boundsCenter: Vector3Snapshot
	transform: Matrix4Snapshot
	bounds: SceneAxisAlignedBoundsMetadata
	originNode: SceneNodeInstanceReference
	material?: SceneMaterialMetadata
	deformation?: SceneStretchDeformationMetadata
	rotateAnimationHint?: SceneRotateAnimationHint
}

export interface SceneMetadata {
	assetInstances: SceneAssetInstanceMetadata[]
}

export function emptySceneMetadata(): SceneMetadata {
	return { assetInstances: [] }
}

export function isSceneMetadata(value: unknown): value is SceneMetadata {
	return Boolean(
		value
		&& typeof value === 'object'
		&& Array.isArray((value as SceneMetadata).assetInstances)
	)
}
