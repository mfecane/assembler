import { BufferGeometry, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface AssetRegistration {
	id: string
	label: string
	url: string
}

export interface AssetRegistrationTarget {
	add(id: string, label: string, geometry: BufferGeometry, selectable?: boolean): void
}

export class AssetRegistrar {
	private readonly assets = new Map<string, AssetRegistration>()

	public constructor(private readonly scale: number) {
		if (!Number.isFinite(scale) || scale <= 0) {
			throw new Error(`Asset scale must be a positive finite number; received ${scale}`)
		}
	}

	public register(asset: AssetRegistration): void {
		if (this.assets.has(asset.id)) {
			throw new Error(`Mesh asset "${asset.id}" is already registered`)
		}
		this.assets.set(asset.id, asset)
	}

	public async loadInto(target: AssetRegistrationTarget): Promise<void> {
		const loadedAssets = await Promise.all(
			[...this.assets.values()].map(async (asset) => ({
				asset,
				geometry: await loadAssetGeometry(asset, this.scale),
			}))
		)

		for (const { asset, geometry } of loadedAssets) {
			target.add(asset.id, asset.label, geometry, true)
		}
	}
}

async function loadAssetGeometry(asset: AssetRegistration, scale: number): Promise<BufferGeometry> {
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
