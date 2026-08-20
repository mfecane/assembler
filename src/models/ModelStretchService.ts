import { Box3, type BufferGeometry, Vector3 } from 'three'
import type { ModelPivot } from '@/models/ModelPivotMetadata'
import type { ModelGeometryAxis, ModelStretchAxis } from '@/models/ModelStretchMetadata'
import { validateModelTexelSizeRatio } from '@/models/ModelTexelSizeRatio'

const GEOMETRY_AXES: ModelGeometryAxis[] = ['x', 'y', 'z']

export class ModelStretchService {
	public deformGeometry(
		geometry: BufferGeometry,
		sourcePositions: ArrayLike<number>,
		sourceUvs: ArrayLike<number> | null,
		stretchAxes: readonly ModelStretchAxis[],
		texelSizeRatio: number,
		sourceSize: Record<ModelGeometryAxis, number>,
		targetSize: Record<ModelGeometryAxis, number>
	): void {
		validateModelTexelSizeRatio(texelSizeRatio)
		const position = geometry.getAttribute('position')
		const uv = geometry.getAttribute('uv')
		const axesScalingUvs = stretchAxes.filter((axis) => (
			axis.textureAxis !== null && targetSize[axis.axis] !== sourceSize[axis.axis]
		))
		if (axesScalingUvs.length > 0 && (!uv || !sourceUvs)) {
			throw new Error(
				'Cannot deform model geometry because UV scaling is enabled but the geometry has no UV attribute. '
				+ `UV-scaled axes: ${axesScalingUvs.map((axis) => (
					`${axis.axis.toUpperCase()}→${axis.textureAxis?.toUpperCase()}`
				)).join(', ')}. Source size: ${JSON.stringify(sourceSize)}. `
				+ `Target size: ${JSON.stringify(targetSize)}.`
			)
		}

		for (let vertex = 0; vertex < position.count; vertex += 1) {
			position.setXYZ(
				vertex,
				sourcePositions[vertex * position.itemSize],
				sourcePositions[vertex * position.itemSize + 1],
				sourcePositions[vertex * position.itemSize + 2]
			)
			if (uv && sourceUvs) {
				uv.setXY(
					vertex,
					sourceUvs[vertex * uv.itemSize],
					sourceUvs[vertex * uv.itemSize + 1]
				)
			}
		}

		for (const stretchAxis of stretchAxes) {
			const positionIndex = axisIndex(stretchAxis.axis)
			const totalStretchLength = stretchAxis.getTotalStretchLength()
			const sizeDelta = targetSize[stretchAxis.axis] - sourceSize[stretchAxis.axis]
			const stretchRatioDelta = sizeDelta / totalStretchLength
			const textureIndex = stretchAxis.textureAxis === null
				? null
				: stretchAxis.textureAxis === 'u' ? 0 : 1
			const textureDirection = stretchAxis.axis === 'y' && stretchAxis.textureAxis === 'v' ? -1 : 1
			for (let vertex = 0; vertex < position.count; vertex += 1) {
				const sourceCoordinate = sourcePositions[vertex * position.itemSize + positionIndex]
				const delta = this.calculateCoordinateDelta(sourceCoordinate, stretchAxis, stretchRatioDelta)
				position.setComponent(vertex, positionIndex, sourceCoordinate + delta)
				if (textureIndex !== null && uv && sourceUvs) {
					const sourceUv = sourceUvs[vertex * uv.itemSize + textureIndex]
					if (!Number.isFinite(sourceUv)) {
						throw new Error(
							`Cannot deform ${stretchAxis.axis.toUpperCase()} because vertex ${vertex} has `
							+ `invalid ${stretchAxis.textureAxis?.toUpperCase()} coordinate ${sourceUv}. `
							+ `Stretch boxes: ${describeBoxes(stretchAxis)}.`
						)
					}
					uv.setComponent(
						vertex,
						textureIndex,
						sourceUv + delta * texelSizeRatio * textureDirection
					)
				}
			}
		}

		position.needsUpdate = true
		if (uv) uv.needsUpdate = true
		geometry.computeVertexNormals()
		geometry.computeBoundingBox()
		geometry.computeBoundingSphere()
	}

	public getPivotOffset(
		sourceBounds: Box3,
		stretchedBounds: Box3,
		sourceSize: Record<ModelGeometryAxis, number>,
		targetSize: Record<ModelGeometryAxis, number>,
		pivot: ModelPivot
	): Vector3 {
		const sourceCenter = sourceBounds.getCenter(new Vector3())
		const stretchedCenter = stretchedBounds.getCenter(new Vector3())
		const offset = new Vector3()
		for (const axis of GEOMETRY_AXES) {
			const scale = targetSize[axis] / sourceSize[axis]
			const desiredCenter = pivot[axis] + (sourceCenter[axis] - pivot[axis]) * scale
			offset[axis] = desiredCenter - stretchedCenter[axis]
		}
		return offset
	}

	private calculateCoordinateDelta(
		coordinate: number,
		stretchAxis: ModelStretchAxis,
		stretchRatioDelta: number
	): number {
		let stretchableDistance = 0
		for (const box of stretchAxis.boxes) {
			if (coordinate <= box.min) break
			stretchableDistance += Math.min(coordinate, box.max) - box.min
			if (coordinate <= box.max) break
		}
		return stretchableDistance * stretchRatioDelta
	}
}

function describeBoxes(stretchAxis: ModelStretchAxis): string {
	return stretchAxis.boxes.map((box) => `${box.min}–${box.max}`).join(', ')
}

function axisIndex(axis: ModelGeometryAxis): number {
	if (axis === 'x') return 0
	if (axis === 'y') return 1
	return 2
}
