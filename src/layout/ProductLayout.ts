import type { SceneMetadata } from '@/parametric/evaluation/SceneMetadata'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface ProductLayout {
	getSlotPositions(items: readonly SceneMetadata[]): Vector3Snapshot[]
	getNextSlotCenter(items: readonly SceneMetadata[]): Vector3Snapshot
}
