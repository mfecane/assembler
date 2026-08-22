import type { ProductLayout } from '@/layout/ProductLayout'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export class SingleItemLayout implements ProductLayout {
	public readonly id = 'single'
	public readonly label = 'Single item'
	public readonly maximumInstances = 1

	public canInstantiateGraph(graphId: string, rootGraphIds: readonly string[]): boolean {
		return rootGraphIds.includes(graphId)
	}

	public getSlotPositions(): Vector3Snapshot[] {
		return [{ x: 0, y: 0, z: 0 }]
	}

	public getNextSlotCenter(): Vector3Snapshot {
		return { x: 0, y: 0, z: 0 }
	}
}
