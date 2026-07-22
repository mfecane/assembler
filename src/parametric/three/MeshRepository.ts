import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, Vector3 } from 'three'
import { ASSET_SCALE, LEGACY_ASSET_ALIASES } from '@/cosntants'
import type { PrimitiveKind } from '@/parametric/model/GraphNode'
import type { MeshBounds, MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import { AssetRegistrar } from '@/parametric/three/AssetRegistrar'
import { registerMaxshelfAssets } from '@/parametric/three/registerMaxshelfAssets'

export class MeshRepository implements MeshCatalog {
	private readonly geometries = new Map<string, BufferGeometry>()
	private readonly descriptors = new Map<string, MeshDescriptor>()
	private readonly bounds = new Map<string, MeshBounds>()

	public add(id: string, label: string, geometry: BufferGeometry, selectable = false): void {
		geometry.computeBoundingBox()
		this.geometries.set(id, geometry)
		this.descriptors.set(id, { id, label, selectable })
		const size = geometry.boundingBox?.getSize(new Vector3())
		const center = geometry.boundingBox?.getCenter(new Vector3())
		if (size && center) {
			this.bounds.set(id, {
				x: size.x,
				y: size.y,
				z: size.z,
				center: { x: center.x, y: center.y, z: center.z },
			})
		}
	}

	public addAlias(id: string, label: string, sourceId: string): void {
		const geometry = this.geometries.get(sourceId)
		const bounds = this.bounds.get(sourceId)
		if (!geometry || !bounds) {
			throw new Error(`Cannot alias missing mesh asset "${sourceId}"`)
		}

		this.geometries.set(id, geometry)
		this.bounds.set(id, bounds)
		this.descriptors.set(id, { id, label, selectable: true })
	}

	public has(id: string): boolean {
		return this.geometries.has(id)
	}

	public createGeometry(id: string): BufferGeometry | undefined {
		return this.geometries.get(id)?.clone()
	}

	public getSize(id: string): { x: number; y: number; z: number } | undefined {
		return this.getBounds(id)
	}

	public getBounds(id: string): MeshBounds | undefined {
		const bounds = this.bounds.get(id)
		return bounds ? { ...bounds, center: { ...bounds.center } } : undefined
	}

	public getMeshes(): readonly MeshDescriptor[] {
		return [...this.descriptors.values()].map((descriptor) => ({ ...descriptor }))
	}
}

export function primitiveMeshId(kind: PrimitiveKind): string {
	return `primitive:${kind}`
}

function createMeshRepository(): MeshRepository {
	const repository = new MeshRepository()

	// Primitive node geometry is internal and does not appear in Mesh Selector.
	repository.add(primitiveMeshId('box'), 'Box', new BoxGeometry(1, 1, 1))
	repository.add(primitiveMeshId('sphere'), 'Sphere', new SphereGeometry(0.5, 32, 16))
	repository.add(primitiveMeshId('cylinder'), 'Cylinder', new CylinderGeometry(0.5, 0.5, 1, 32))
	repository.add(primitiveMeshId('cone'), 'Cone', new ConeGeometry(0.5, 1, 32))

	return repository
}

export const meshRepository = createMeshRepository()

let assetLoadPromise: Promise<void> | undefined

export function loadMeshRepositoryAssets(): Promise<void> {
	if (!assetLoadPromise) {
		const registrar = new AssetRegistrar(ASSET_SCALE)
		registerMaxshelfAssets(registrar)
		assetLoadPromise = registrar.loadInto(meshRepository).then(() => {
			// Keep saved graphs from the FBX catalog working while resolving them to Maxshelf GLBs.
			for (const alias of LEGACY_ASSET_ALIASES) {
				meshRepository.addAlias(alias.id, alias.label, alias.sourceId)
			}
		})
	}
	return assetLoadPromise
}
