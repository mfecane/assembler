import { Box3, Matrix4, Vector3 } from 'three'
import type {
	Matrix4Snapshot,
	SceneAssetInstanceMetadata,
	SceneAxisAlignedBoundsMetadata,
} from '@/parametric/evaluation/SceneMetadata'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function calculateSceneAxisAlignedBounds(
	size: Vector3Snapshot,
	center: Vector3Snapshot,
	transform: Matrix4Snapshot
): SceneAxisAlignedBoundsMetadata {
	const halfSize = new Vector3(size.x, size.y, size.z).multiplyScalar(0.5)
	const box = new Box3(
		new Vector3(center.x, center.y, center.z).sub(halfSize),
		new Vector3(center.x, center.y, center.z).add(halfSize)
	).applyMatrix4(new Matrix4().fromArray(transform))
	return {
		min: { x: box.min.x, y: box.min.y, z: box.min.z },
		max: { x: box.max.x, y: box.max.y, z: box.max.z },
	}
}

export function setSceneAssetInstanceTransform(
	instance: SceneAssetInstanceMetadata,
	transform: Matrix4Snapshot,
	instanceId = instance.instanceId
): SceneAssetInstanceMetadata {
	const transformDelta = new Matrix4()
		.fromArray(transform)
		.multiply(new Matrix4().fromArray(instance.transform).invert())
	const rotateAnimationHint = instance.rotateAnimationHint && {
		...instance.rotateAnimationHint,
		pivot: new Vector3(
			instance.rotateAnimationHint.pivot.x,
			instance.rotateAnimationHint.pivot.y,
			instance.rotateAnimationHint.pivot.z
		).applyMatrix4(transformDelta),
		axisDirection: new Vector3(
			instance.rotateAnimationHint.axisDirection.x,
			instance.rotateAnimationHint.axisDirection.y,
			instance.rotateAnimationHint.axisDirection.z
		).transformDirection(transformDelta),
	}
	return {
		...instance,
		instanceId,
		transform,
		...(rotateAnimationHint ? { rotateAnimationHint } : {}),
		bounds: calculateSceneAxisAlignedBounds(
			instance.size,
			instance.boundsCenter,
			transform
		),
	}
}
