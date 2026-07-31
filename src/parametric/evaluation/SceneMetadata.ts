import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

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
	type: 'standard'
	color: string
}

export interface SceneAssetInstanceMetadata {
	instanceId: string
	assetId: string
	assetKind: 'catalog' | 'primitive'
	size: Vector3Snapshot
	transform: Matrix4Snapshot
	originNode: SceneNodeInstanceReference
	material?: SceneMaterialMetadata
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
