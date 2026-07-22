import {
	ASSET_METADATA_FORMAT,
	ASSET_METADATA_FORMAT_VERSION,
	ASSET_SCALE,
	MAXSHELF_ASSET_ID_PREFIX,
} from '@/cosntants'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'

export interface AssetMetadataEntry {
	id: string
	label: string
	category: string
	boundingBox: {
		center: {
			x: number
			y: number
			z: number
		}
		size: {
			x: number
			y: number
			z: number
		}
	}
}

export interface AssetMetadataDocument {
	format: typeof ASSET_METADATA_FORMAT
	version: typeof ASSET_METADATA_FORMAT_VERSION
	assetScale: number
	dimensionsIncludeAssetScale: true
	units: 'scene-units'
	axisDescription: 'Local geometry axes after asset transforms and common scaling'
	assetCount: number
	assets: AssetMetadataEntry[]
}

export function createAssetMetadataDocument(meshCatalog: MeshCatalog): AssetMetadataDocument {
	const assets = meshCatalog
		.getMeshes()
		.filter((mesh) => mesh.id.startsWith(MAXSHELF_ASSET_ID_PREFIX))
		.map((mesh) => {
			const bounds = meshCatalog.getBounds(mesh.id)
			if (!bounds) {
				throw new Error(`Mesh asset "${mesh.id}" has no bounding box`)
			}

			return {
				id: mesh.id,
				label: mesh.label,
				category: getAssetCategory(mesh.id),
				boundingBox: {
					center: {
						x: roundDimension(bounds.center.x),
						y: roundDimension(bounds.center.y),
						z: roundDimension(bounds.center.z),
					},
					size: {
						x: roundDimension(bounds.x),
						y: roundDimension(bounds.y),
						z: roundDimension(bounds.z),
					},
				},
			}
		})
		.sort((left, right) => left.id.localeCompare(right.id))

	return {
		format: ASSET_METADATA_FORMAT,
		version: ASSET_METADATA_FORMAT_VERSION,
		assetScale: ASSET_SCALE,
		dimensionsIncludeAssetScale: true,
		units: 'scene-units',
		axisDescription: 'Local geometry axes after asset transforms and common scaling',
		assetCount: assets.length,
		assets,
	}
}

function getAssetCategory(id: string): string {
	return id.slice(MAXSHELF_ASSET_ID_PREFIX.length).split(':', 1)[0]
}

function roundDimension(value: number): number {
	return Number(value.toFixed(6))
}
