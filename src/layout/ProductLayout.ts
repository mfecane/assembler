import type { SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface ProductLayout {
	readonly id: string
	readonly label: string
	readonly maximumInstances: number
	canInstantiateGraph(graphId: string, rootGraphIds: readonly string[]): boolean
	getSlotPositions(items: readonly SceneMetadata[]): Vector3Snapshot[]
	getNextSlotCenter(items: readonly SceneMetadata[]): Vector3Snapshot
}
