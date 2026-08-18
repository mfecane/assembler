import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, Vector3 } from 'three'
import { type Client, LEGACY_ASSET_ALIASES } from '@/cosntants'
import type { PrimitiveKind } from '@/parametric/model/GraphNode'
import type { MeshBounds, MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import { AssetRegistrar } from '@/parametric/three/AssetRegistrar'
import { registerMaxshelfAssets } from '@/parametric/three/registerMaxshelfAssets'
import { registerKitchenAssets } from '@/parametric/three/registerKitchenAssets'

export class MeshRepository implements MeshCatalog {
	private readonly geometries = new Map<string, BufferGeometry>()
	private readonly descriptors = new Map<string, MeshDescriptor>()
	private readonly bounds = new Map<string, MeshBounds>()

	public add(
		id: string,
		label: string,
		geometry: BufferGeometry,
		client: Client | null,
		selectable = false
	): void {
		geometry.computeBoundingBox()
		this.geometries.set(id, geometry)
		this.descriptors.set(id, { id, label, client, selectable })
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
		const client = this.descriptors.get(sourceId)?.client
		if (!client) throw new Error(`Cannot alias mesh asset "${sourceId}" without a client ID`)
		this.descriptors.set(id, { id, label, client, selectable: true })
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

	public forClient(client: Client): MeshCatalog {
		return new ClientMeshCatalog(this, client)
	}
}

class ClientMeshCatalog implements MeshCatalog {
	public constructor(
		private readonly repository: MeshRepository,
		private readonly client: Client
	) {}

	public getMeshes(): readonly MeshDescriptor[] {
		return this.repository.getMeshes().filter(
			(mesh) => mesh.client === null || mesh.client === this.client
		)
	}

	public getBounds(id: string): MeshBounds | undefined {
		return this.hasAccess(id) ? this.repository.getBounds(id) : undefined
	}

	public createGeometry(id: string): BufferGeometry | undefined {
		return this.hasAccess(id) ? this.repository.createGeometry(id) : undefined
	}

	private hasAccess(id: string): boolean {
		return this.repository.getMeshes().some(
			(mesh) => mesh.id === id && (mesh.client === null || mesh.client === this.client)
		)
	}
}

export function primitiveMeshId(kind: PrimitiveKind): string {
	return `primitive:${kind}`
}

function createMeshRepository(): MeshRepository {
	const repository = new MeshRepository()

	// Primitive node geometry is internal and is not selectable as a mesh asset.
	repository.add(primitiveMeshId('box'), 'Box', new BoxGeometry(1, 1, 1), null)
	repository.add(primitiveMeshId('sphere'), 'Sphere', new SphereGeometry(0.5, 32, 16), null)
	repository.add(primitiveMeshId('cylinder'), 'Cylinder', new CylinderGeometry(0.5, 0.5, 1, 32), null)
	repository.add(primitiveMeshId('cone'), 'Cone', new ConeGeometry(0.5, 1, 32), null)

	return repository
}

export const meshRepository = createMeshRepository()

let assetLoadPromise: Promise<void> | undefined

export function loadMeshRepositoryAssets(): Promise<void> {
	if (!assetLoadPromise) {
		const registrar = new AssetRegistrar()
		registerMaxshelfAssets(registrar)
		registerKitchenAssets(registrar)
		assetLoadPromise = registrar.loadInto(meshRepository).then(() => {
			// Keep saved graphs from the FBX catalog working while resolving them to Maxshelf GLBs.
			for (const alias of LEGACY_ASSET_ALIASES) {
				meshRepository.addAlias(alias.id, alias.label, alias.sourceId)
			}
		})
	}
	return assetLoadPromise
}
