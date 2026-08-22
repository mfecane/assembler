import { meshRepository } from '@/parametric/three/MeshRepository'
import type { MeshBounds } from '@/parametric/model/MeshCatalog'

export interface ModelBoundingBoxMetadata {
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

export function readModelBoundingBox(modelId: string): ModelBoundingBoxMetadata {
	const bounds = meshRepository.getBounds(modelId)
	if (!bounds) {
		throw new Error(
			`Cannot read size and center offset for model "${modelId}" because its loaded geometry `
			+ 'has no computed bounds.'
		)
	}
	return {
		center: {
			x: round(bounds.center.x),
			y: round(bounds.center.y),
			z: round(bounds.center.z),
		},
		size: {
			x: round(bounds.x),
			y: round(bounds.y),
			z: round(bounds.z),
		},
	}
}

export function readStoredModelBoundingBox(
	metadata: Record<string, unknown>,
	modelId: string
): ModelBoundingBoxMetadata {
	const fallback = readModelBoundingBox(modelId)
	const boundingBox = metadata.boundingBox
	if (boundingBox === undefined) return fallback
	if (!isJsonObject(boundingBox)) {
		throw new Error(
			`Cannot display bounding box for model "${modelId}" because metadata.boundingBox must be an object `
			+ `when present. Received ${describe(boundingBox)}.`
		)
	}
	return {
		size: readOptionalVector(boundingBox.size, fallback.size, 'boundingBox.size', modelId),
		center: readOptionalVector(boundingBox.center, fallback.center, 'boundingBox.center', modelId),
	}
}

export function readStoredModelMeshBounds(
	modelId: string,
	metadata: Record<string, unknown>
): MeshBounds {
	const boundingBox = metadata.boundingBox
	if (!isJsonObject(boundingBox)) {
		throw new Error(
			`Cannot evaluate geometry for model "${modelId}": metadata.boundingBox must be an object. `
			+ `Received ${describe(boundingBox)}.`
		)
	}
	const size = readRequiredVector(boundingBox.size, 'boundingBox.size', modelId, true)
	const center = readRequiredVector(boundingBox.center, 'boundingBox.center', modelId, false)
	return { x: size.x, y: size.y, z: size.z, center }
}

export function withModelBoundingBox(
	metadata: Record<string, unknown>,
	boundingBox: ModelBoundingBoxMetadata
): Record<string, unknown> {
	const currentBoundingBox = isJsonObject(metadata.boundingBox) ? metadata.boundingBox : {}
	return {
		...metadata,
		boundingBox: {
			...currentBoundingBox,
			center: boundingBox.center,
			size: boundingBox.size,
		},
	}
}

function readOptionalVector(
	value: unknown,
	fallback: ModelBoundingBoxMetadata['size'],
	field: string,
	modelId: string
): ModelBoundingBoxMetadata['size'] {
	if (value === undefined) return { ...fallback }
	if (!isJsonObject(value)) {
		throw new Error(
			`Cannot display bounding box for model "${modelId}" because metadata.${field} must be an object `
			+ `when present. Received ${describe(value)}.`
		)
	}
	return {
		x: readOptionalCoordinate(value, 'x', fallback.x, field, modelId),
		y: readOptionalCoordinate(value, 'y', fallback.y, field, modelId),
		z: readOptionalCoordinate(value, 'z', fallback.z, field, modelId),
	}
}

function readRequiredVector(
	value: unknown,
	field: string,
	modelId: string,
	positive: boolean
): ModelBoundingBoxMetadata['size'] {
	if (!isJsonObject(value)) {
		throw new Error(
			`Cannot evaluate geometry for model "${modelId}": metadata.${field} must be an object. `
			+ `Received ${describe(value)}.`
		)
	}
	return {
		x: readRequiredCoordinate(value.x, field, 'x', modelId, positive),
		y: readRequiredCoordinate(value.y, field, 'y', modelId, positive),
		z: readRequiredCoordinate(value.z, field, 'z', modelId, positive),
	}
}

function readRequiredCoordinate(
	value: unknown,
	field: string,
	axis: 'x' | 'y' | 'z',
	modelId: string,
	positive: boolean
): number {
	if (
		typeof value !== 'number'
		|| !Number.isFinite(value)
		|| (positive && value <= 0)
	) {
		throw new Error(
			`Cannot evaluate geometry for model "${modelId}": metadata.${field}.${axis} must be `
			+ `a ${positive ? 'positive ' : ''}finite number. Received ${describe(value)}.`
		)
	}
	return value
}

function readOptionalCoordinate(
	value: Record<string, unknown>,
	axis: 'x' | 'y' | 'z',
	fallback: number,
	field: string,
	modelId: string
): number {
	const coordinate = value[axis]
	if (coordinate === undefined) return fallback
	if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) {
		throw new Error(
			`Cannot display bounding box for model "${modelId}" because metadata.${field}.${axis} must be `
			+ `a finite number when present. Received ${describe(coordinate)}.`
		)
	}
	return coordinate
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function round(value: number): number {
	return Number(value.toFixed(6))
}

function describe(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value)
	} catch {
		return String(value)
	}
}
