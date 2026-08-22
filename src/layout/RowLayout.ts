import { Box3, Matrix4, Vector3 } from 'three'
import type { ProductLayout } from '@/layout/ProductLayout'
import type { SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export class RowLayout implements ProductLayout {
	public readonly id = 'row'
	public readonly label = 'Row'
	public readonly maximumInstances = 20

	public canInstantiateGraph(graphId: string, rootGraphIds: readonly string[]): boolean {
		return rootGraphIds.includes(graphId)
	}

	public getSlotPositions(items: readonly SceneMetadata[]): Vector3Snapshot[] {
		const positions: Vector3Snapshot[] = []
		let previousRight = 0

		for (let index = 0; index < items.length; index += 1) {
			const bounds = getItemBounds(items[index], index)
			const x = index === 0 ? 0 : previousRight - bounds.min.x
			positions.push({ x, y: 0, z: 0 })
			previousRight = bounds.max.x + x
		}

		return positions
	}

	public getNextSlotCenter(items: readonly SceneMetadata[]): Vector3Snapshot {
		if (items.length === 0) return { x: 0, y: 0, z: 0 }

		const positions = this.getSlotPositions(items)
		const averageBounds = getAverageItemBounds(items)
		const lastItemIndex = items.length - 1
		const lastBounds = getItemBounds(items[lastItemIndex], lastItemIndex)
		const previousRight = lastBounds.max.x + positions[lastItemIndex].x
		const averageCenter = averageBounds.getCenter(new Vector3())

		return {
			x: previousRight - averageBounds.min.x + averageCenter.x,
			y: averageCenter.y,
			z: averageCenter.z,
		}
	}
}

function getAverageItemBounds(items: readonly SceneMetadata[]): Box3 {
	const totalMin = new Vector3()
	const totalMax = new Vector3()

	for (let index = 0; index < items.length; index += 1) {
		const bounds = getItemBounds(items[index], index)
		totalMin.add(bounds.min)
		totalMax.add(bounds.max)
	}

	return new Box3(totalMin.divideScalar(items.length), totalMax.divideScalar(items.length))
}

function getItemBounds(metadata: SceneMetadata, itemIndex: number): Box3 {
	const bounds = new Box3()

	for (const asset of metadata.assetInstances) {
		const halfSize = new Vector3(asset.size.x, asset.size.y, asset.size.z).multiplyScalar(0.5)
		const center = new Vector3(asset.boundsCenter.x, asset.boundsCenter.y, asset.boundsCenter.z)
		const assetBounds = new Box3(center.clone().sub(halfSize), center.clone().add(halfSize))
		assetBounds.applyMatrix4(new Matrix4().fromArray(asset.transform))
		bounds.union(assetBounds)
	}

	if (bounds.isEmpty()) {
		throw new Error(
			`Row layout cannot determine the size of item at index ${itemIndex}: its evaluated scene `
			+ 'contains no asset instances.'
		)
	}
	return bounds
}
