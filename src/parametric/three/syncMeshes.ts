import { BufferGeometry, LessDepth, Mesh, MeshStandardMaterial, Scene } from 'three'
import type {
	SceneAssetInstanceMetadata,
	SceneMetadata,
} from '@/parametric/evaluation/SceneMetadata'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'
import { meshRepository } from '@/parametric/three/MeshRepository'

function createGeometry(item: SceneAssetInstanceMetadata): BufferGeometry {
	const geometry = meshRepository.createGeometry(item.assetId)
	if (!geometry) {
		throw new Error(
			`Cannot build scene instance "${item.instanceId}" from asset "${item.assetId}": `
			+ `no registered geometry exists. Origin node: graph "${item.originNode.graphId}", `
			+ `node "${item.originNode.nodeId}", instance "${item.originNode.nodeInstanceId}".`
		)
	}
	const baseSize = meshRepository.getSize(item.assetId)
	if (!baseSize) {
		geometry.dispose()
		throw new Error(
			`Cannot size scene instance "${item.instanceId}" from asset "${item.assetId}": `
			+ `registered bounds are missing. Origin node: graph "${item.originNode.graphId}", `
			+ `node "${item.originNode.nodeId}", instance "${item.originNode.nodeInstanceId}".`
		)
	}
	return geometry.scale(
		baseSize.x === 0 ? 1 : item.size.x / baseSize.x,
		baseSize.y === 0 ? 1 : item.size.y / baseSize.y,
		baseSize.z === 0 ? 1 : item.size.z / baseSize.z
	)
}

function getMaterialColor(item: SceneAssetInstanceMetadata): string {
	return item.material?.type === 'standard' ? item.material.color : defaultMaterialColor
}

function createMaterial(item: SceneAssetInstanceMetadata, ghost: boolean): MeshStandardMaterial {
	return new MeshStandardMaterial({
		color: getMaterialColor(item),
		transparent: ghost,
		opacity: ghost ? 0.18 : 1,
		depthWrite: !ghost,
		depthFunc: ghost ? LessDepth : undefined,
	})
}

function disposeMaterial(mesh: Mesh): void {
	const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
	for (const material of materials) material.dispose()
}

export function syncSceneMetadata(
	scene: Scene,
	meshesById: Map<string, Mesh>,
	metadata: SceneMetadata,
	options: { ghost?: boolean } = {}
) {
	const ghost = options.ghost ?? false
	const seenIds = new Set<string>()

	for (const item of metadata.assetInstances) {
		seenIds.add(item.instanceId)
		let mesh = meshesById.get(item.instanceId)
		const geometryKey = `${item.assetId}:${item.size.x}:${item.size.y}:${item.size.z}`
		const materialKey = `standard:${getMaterialColor(item)}:${ghost ? 'ghost' : 'opaque'}`

		if (!mesh) {
			mesh = new Mesh(createGeometry(item), createMaterial(item, ghost))
			mesh.userData.geometryKey = geometryKey
			mesh.userData.materialKey = materialKey
			mesh.castShadow = !ghost
			mesh.receiveShadow = !ghost
			mesh.renderOrder = ghost ? -1 : 0
			scene.add(mesh)
			meshesById.set(item.instanceId, mesh)
		} else if (mesh.userData.geometryKey !== geometryKey) {
			mesh.geometry.dispose()
			mesh.geometry = createGeometry(item)
			mesh.userData.geometryKey = geometryKey
		}
		if (mesh.userData.materialKey !== materialKey) {
			disposeMaterial(mesh)
			mesh.material = createMaterial(item, ghost)
			mesh.userData.materialKey = materialKey
		}

		mesh.userData.sceneInstance = item
		mesh.matrixAutoUpdate = false
		mesh.matrix.fromArray(item.transform)
		mesh.updateMatrixWorld(true)
	}

	for (const [instanceId, mesh] of meshesById) {
		if (!seenIds.has(instanceId)) {
			scene.remove(mesh)
			mesh.geometry.dispose()
			disposeMaterial(mesh)
			meshesById.delete(instanceId)
		}
	}
}
