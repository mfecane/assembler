import { createModelStretchSizeConstraint } from '@/models/ModelStretchSizeConstraint'
import {
	readModelStretchAxes,
	readModelStretchEnabled,
	type ModelGeometryAxis,
	type ModelStretchAxis,
} from '@/models/ModelStretchMetadata'
import { readModelPivot, type ModelPivot } from '@/models/ModelPivotMetadata'
import type { MeshBounds } from '@/parametric/model/MeshCatalog'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'

const GEOMETRY_AXES: ModelGeometryAxis[] = ['x', 'y', 'z']

export class StretchableAssetMetadata {
	public readonly naturalSize: Vector3Value
	public readonly pivot: ModelPivot
	public readonly stretchAxes: ModelStretchAxis[]

	public constructor(
		public readonly meshId: string,
		bounds: MeshBounds,
		metadata: Record<string, unknown>
	) {
		this.naturalSize = Vector3Value.from(readNaturalSize(meshId, metadata, bounds))
		this.pivot = readModelPivot(metadata)
		this.stretchAxes = readModelStretchEnabled(metadata) ? readModelStretchAxes(metadata) : []
	}

	public constrainTargetSize(requested: Vector3Snapshot): Vector3Value {
		const constrained = { ...requested }
		for (const axis of GEOMETRY_AXES) {
			const stretchAxis = this.stretchAxes.find((candidate) => candidate.axis === axis)
			if (!stretchAxis) {
				if (requested[axis] !== this.naturalSize[axis]) {
					throw new Error(
						`Cannot stretch asset "${this.meshId}" on ${axis.toUpperCase()} to ${requested[axis]}: `
						+ `model metadata does not enable ${axis.toUpperCase()} stretch boxes. `
						+ `Natural size: ${this.naturalSize[axis]}. Configured stretch axes: `
						+ `${this.stretchAxes.map((item) => item.axis.toUpperCase()).join(', ') || 'none'}.`
					)
				}
				continue
			}
			constrained[axis] = createModelStretchSizeConstraint(
				this.naturalSize[axis],
				stretchAxis
			).constrain(requested[axis])
		}
		return Vector3Value.from(constrained)
	}

	public isStretchable(): boolean {
		return this.stretchAxes.length > 0
	}
}

function readNaturalSize(
	meshId: string,
	metadata: Record<string, unknown>,
	bounds: MeshBounds
): Vector3Snapshot {
	const boundingBox = metadata.boundingBox
	if (boundingBox === undefined) return { x: bounds.x, y: bounds.y, z: bounds.z }
	if (!isJsonObject(boundingBox) || !isJsonObject(boundingBox.size)) {
		throw new Error(
			`Cannot read natural size for stretchable asset "${meshId}": metadata.boundingBox.size `
			+ `must be an object. Received ${describe(boundingBox)}.`
		)
	}
	return {
		x: readPositiveSize(meshId, boundingBox.size, 'x'),
		y: readPositiveSize(meshId, boundingBox.size, 'y'),
		z: readPositiveSize(meshId, boundingBox.size, 'z'),
	}
}

function readPositiveSize(
	meshId: string,
	size: Record<string, unknown>,
	axis: ModelGeometryAxis
): number {
	const value = size[axis]
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		throw new Error(
			`Cannot read natural ${axis.toUpperCase()} size for stretchable asset "${meshId}": `
			+ `metadata.boundingBox.size.${axis} must be a positive finite number. `
			+ `Received ${describe(value)} in ${describe(size)}.`
		)
	}
	return value
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function describe(value: unknown): string {
	try {
		return JSON.stringify(value) ?? String(value)
	} catch {
		return String(value)
	}
}
