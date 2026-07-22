import { BufferGeometry, LessDepth, Mesh, MeshStandardMaterial, Scene } from 'three'
import type { EvaluatedMesh } from '@/parametric/evaluation/GraphEvaluator'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'
import { meshRepository } from '@/parametric/three/MeshRepository'

function createGeometry(item: EvaluatedMesh): BufferGeometry {
	const geometry = meshRepository.createGeometry(item.meshId) ?? new BufferGeometry()
	const baseSize = meshRepository.getSize(item.meshId)
	if (!baseSize) return geometry
	return geometry.scale(
		baseSize.x === 0 ? 1 : item.size.x / baseSize.x,
		baseSize.y === 0 ? 1 : item.size.y / baseSize.y,
		baseSize.z === 0 ? 1 : item.size.z / baseSize.z
	)
}

function getMaterialColor(item: EvaluatedMesh): string {
	return item.material?.type === 'standard' ? item.material.color : defaultMaterialColor
}

function createMaterial(item: EvaluatedMesh, ghost: boolean): MeshStandardMaterial {
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

export function syncMeshes(
	scene: Scene,
	meshesById: Map<string, Mesh>,
	evaluated: EvaluatedMesh[],
	options: { ghost?: boolean } = {}
) {
	const ghost = options.ghost ?? false
	const seenIds = new Set<string>()

	for (const item of evaluated) {
		seenIds.add(item.nodeId)
		let mesh = meshesById.get(item.nodeId)
		const geometryKey = `${item.meshId}:${item.size.x}:${item.size.y}:${item.size.z}`
		const materialKey = `standard:${getMaterialColor(item)}:${ghost ? 'ghost' : 'opaque'}`

		if (!mesh) {
			mesh = new Mesh(createGeometry(item), createMaterial(item, ghost))
			mesh.userData.geometryKey = geometryKey
			mesh.userData.materialKey = materialKey
			mesh.castShadow = !ghost
			mesh.receiveShadow = !ghost
			mesh.renderOrder = ghost ? -1 : 0
			scene.add(mesh)
			meshesById.set(item.nodeId, mesh)
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

		mesh.userData.evaluatedMeshId = item.nodeId
		mesh.userData.assetSource = item.assetSource
		mesh.matrixAutoUpdate = false
		mesh.matrix.copy(item.matrix)
		mesh.updateMatrixWorld(true)
	}

	for (const [nodeId, mesh] of meshesById) {
		if (!seenIds.has(nodeId)) {
			scene.remove(mesh)
			mesh.geometry.dispose()
			disposeMaterial(mesh)
			meshesById.delete(nodeId)
		}
	}
}
