import { BufferGeometry, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ASSET_SCALE_BY_CLIENT, type Client } from '@/cosntants'

export interface AssetRegistration {
	id: string
	label: string
	url: string
	client: Client
}

export interface AssetRegistrationTarget {
	add(
		id: string,
		label: string,
		geometry: BufferGeometry,
		client: Client,
		selectable?: boolean
	): void
}

export class AssetRegistrar {
	private readonly assets = new Map<string, AssetRegistration>()

	public register(asset: AssetRegistration): void {
		if (this.assets.has(asset.id)) {
			throw new Error(
				`Mesh asset "${asset.id}" for client "${asset.client}" is already registered. `
				+ `Attempted URL: ${asset.url}`
			)
		}
		this.assets.set(asset.id, asset)
	}

	public async loadInto(target: AssetRegistrationTarget): Promise<void> {
		const loadedAssets = await Promise.all(
			[...this.assets.values()].map(async (asset) => {
				const scale = ASSET_SCALE_BY_CLIENT[asset.client]
				if (!Number.isFinite(scale) || scale <= 0) {
					throw new Error(
						`Mesh asset "${asset.id}" for client "${asset.client}" has invalid scale ${scale}. `
						+ 'Client asset scales must be positive finite numbers.'
					)
				}
				try {
					const geometry = await loadAssetGeometry(asset, scale)
					return { asset, geometry }
				} catch (cause) {
					throw new Error(
						`Failed to load mesh asset "${asset.id}" (${asset.label}) for client `
						+ `"${asset.client}" from ${asset.url} at scale ${scale}. `
						+ `Cause: ${describeError(cause)}`
					)
				}
			})
		)

		for (const { asset, geometry } of loadedAssets) {
			target.add(asset.id, asset.label, geometry, asset.client, true)
		}
	}
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause) ?? String(cause)
	} catch {
		return String(cause)
	}
}

async function loadAssetGeometry(
	asset: AssetRegistration,
	scale: number
): Promise<BufferGeometry> {
	const { scene } = await new GLTFLoader().loadAsync(asset.url)
	scene.updateMatrixWorld(true)

	const geometries: BufferGeometry[] = []
	scene.traverse((object) => {
		if (!(object instanceof Mesh)) return
		const geometry = object.geometry.clone()
		geometry.applyMatrix4(object.matrixWorld)
		geometry.scale(scale, scale, scale)
		geometries.push(geometry)
	})

	if (geometries.length === 0) {
		throw new Error(`Mesh asset "${asset.label}" contains no geometry`)
	}
	if (geometries.length === 1) return geometries[0]

	const merged = mergeGeometries(geometries, false)
	for (const geometry of geometries) geometry.dispose()
	if (!merged) throw new Error(`Could not merge geometry in mesh asset "${asset.label}"`)
	return merged
}
