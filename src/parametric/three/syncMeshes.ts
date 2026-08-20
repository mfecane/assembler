import { ModelPivot } from '@/models/ModelPivotMetadata'
import { ModelStretchService } from '@/models/ModelStretchService'
import { ModelStretchAxis, ModelStretchBox } from '@/models/ModelStretchMetadata'
import type { SceneAssetInstanceMetadata, SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import { materialRepository } from '@/parametric/three/MaterialRepository'
import { meshRepository } from '@/parametric/three/MeshRepository'
import {
	BufferGeometry,
	LessDepth,
	Mesh,
	MeshStandardMaterial,
	RepeatWrapping,
	Scene,
	SRGBColorSpace,
	TextureLoader,
} from 'three'

const modelStretchService = new ModelStretchService()

function createGeometry(item: SceneAssetInstanceMetadata): BufferGeometry {
	const geometry = meshRepository.createGeometry(item.assetId)
	if (!geometry) {
		throw new Error(
			`Cannot build scene instance "${item.instanceId}" from asset "${item.assetId}": ` +
				`no registered geometry exists. Origin node: graph "${item.originNode.graphId}", ` +
				`node "${item.originNode.nodeId}", instance "${item.originNode.nodeInstanceId}".`
		)
	}
	const baseSize = meshRepository.getSize(item.assetId)
	if (!baseSize) {
		geometry.dispose()
		throw new Error(
			`Cannot size scene instance "${item.instanceId}" from asset "${item.assetId}": ` +
				`registered bounds are missing. Origin node: graph "${item.originNode.graphId}", ` +
				`node "${item.originNode.nodeId}", instance "${item.originNode.nodeInstanceId}".`
		)
	}
	if (item.deformation?.kind === 'stretch') {
		geometry.computeBoundingBox()
		const sourceBounds = geometry.boundingBox?.clone()
		if (!sourceBounds) {
			geometry.dispose()
			throw new Error(
				`Cannot stretch scene instance "${item.instanceId}" from asset "${item.assetId}": ` +
					'source geometry has no bounding box.'
			)
		}
		const position = geometry.getAttribute('position')
		const uv = geometry.getAttribute('uv')
		const sourcePositions = Float32Array.from(position.array)
		const sourceUvs = uv ? Float32Array.from(uv.array) : null
		const stretchAxes = item.deformation.axes.map(
			(axis) => new ModelStretchAxis(
				axis.axis,
				axis.boxes.map((box) => new ModelStretchBox(box.min, box.max)),
				axis.textureAxis
			)
		)
		modelStretchService.deformGeometry(
			geometry,
			sourcePositions,
			sourceUvs,
			stretchAxes,
			item.deformation.texelSizeRatio,
			item.deformation.sourceSize,
			item.size
		)
		if (!geometry.boundingBox) {
			geometry.dispose()
			throw new Error(
				`Cannot place stretched scene instance "${item.instanceId}" from asset "${item.assetId}": ` +
					'deformed geometry has no bounding box.'
			)
		}
		const pivot = item.deformation.pivot
		const offset = modelStretchService.getPivotOffset(
			sourceBounds,
			geometry.boundingBox,
			item.deformation.sourceSize,
			item.size,
			new ModelPivot(pivot.x, pivot.y, pivot.z)
		)
		geometry.translate(offset.x - pivot.x, offset.y - pivot.y, offset.z - pivot.z)
		geometry.computeBoundingBox()
		geometry.computeBoundingSphere()
		return geometry
	}
	return geometry.scale(
		baseSize.x === 0 ? 1 : item.size.x / baseSize.x,
		baseSize.y === 0 ? 1 : item.size.y / baseSize.y,
		baseSize.z === 0 ? 1 : item.size.z / baseSize.z
	)
}

const textureLoader = new TextureLoader()
const DEFAULT_ASSET_MATERIAL_ID = 'plastic'

function getMaterialId(item: SceneAssetInstanceMetadata): string {
	return item.material?.materialId ?? DEFAULT_ASSET_MATERIAL_ID
}

function getMaterialColor(item: SceneAssetInstanceMetadata): string | undefined {
	return item.material?.color
}

function createMaterial(item: SceneAssetInstanceMetadata, ghost: boolean): MeshStandardMaterial {
	const materialId = getMaterialId(item)
	const definition = materialRepository.getMaterial(materialId)
	if (!definition) {
		throw new Error(
			`Cannot render scene instance "${item.instanceId}" from asset "${item.assetId}": ` +
				`material "${materialId}" is not registered. Origin node: graph ` +
				`"${item.originNode.graphId}", node "${item.originNode.nodeId}", instance ` +
				`"${item.originNode.nodeInstanceId}". Registered materials: ` +
				`${JSON.stringify(materialRepository.getMaterials().map((material) => material.id))}.`
		)
	}
	const texture = definition.textureUrl ? textureLoader.load(definition.textureUrl) : null
	if (texture) {
		texture.colorSpace = SRGBColorSpace
		texture.wrapS = RepeatWrapping
		texture.wrapT = RepeatWrapping
	}
	return new MeshStandardMaterial({
		map: texture,
		roughness: definition.roughness,
		metalness: definition.metalness,
		transparent: ghost,
		opacity: ghost ? 0.18 : 1,
		depthWrite: !ghost,
		depthFunc: ghost ? LessDepth : undefined,
		color: getMaterialColor(item) ?? '#ffffff',
	})
}

function disposeMaterial(mesh: Mesh): void {
	const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
	for (const material of materials) {
		const standardMaterial = material as MeshStandardMaterial
		standardMaterial.map?.dispose()
		material.dispose()
	}
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
		const geometryKey = JSON.stringify({
			assetId: item.assetId,
			size: item.size,
			deformation: item.deformation,
		})
		const materialKey = `${getMaterialId(item)}:${getMaterialColor(item) ?? 'default'}:${ghost ? 'ghost' : 'opaque'}`

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
