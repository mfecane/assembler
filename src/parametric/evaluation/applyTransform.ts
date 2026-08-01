import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Matrix4Snapshot, SceneAssetInstanceMetadata } from '@/parametric/evaluation/SceneMetadata'
import type { TransformField } from '@/parametric/model/fields/TransformField'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

function matrixSnapshot(matrix: Matrix4): Matrix4Snapshot {
	return matrix.elements.slice() as unknown as Matrix4Snapshot
}

function getOriginOffset(origin: 'min' | 'middle' | 'max', size: number): number {
	if (origin === 'min') return -size / 2
	if (origin === 'max') return size / 2
	return 0
}

export function createTransformMatrix(
	transformField: TransformField,
	size: Vector3Snapshot
): Matrix4Snapshot {
	const rotation = transformField.getRotation().toSnapshot()
	const translation = transformField.getTranslation().toSnapshot()
	const scale = transformField.getScale().toSnapshot()
	const origin = transformField.getOrigin()
	const pivot = new Vector3(
		getOriginOffset(origin.x, size.x),
		getOriginOffset(origin.y, size.y),
		getOriginOffset(origin.z, size.z)
	)
	const transform = new Matrix4().compose(
		new Vector3(),
		new Quaternion().setFromEuler(new Euler(
			(rotation.x * Math.PI) / 180,
			(rotation.y * Math.PI) / 180,
			(rotation.z * Math.PI) / 180,
			'XYZ'
		)),
		new Vector3(scale.x, scale.y, scale.z)
	)

	return matrixSnapshot(new Matrix4()
		.makeTranslation(translation.x, translation.y, translation.z)
		.multiply(new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
		.multiply(transform)
		.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z)))
}

export function applyTransform(
	transformField: TransformField,
	instances: readonly SceneAssetInstanceMetadata[],
	instanceId: (instance: SceneAssetInstanceMetadata) => string
): SceneAssetInstanceMetadata[] {
	return instances.map((instance) => ({
		...instance,
		instanceId: instanceId(instance),
		transform: matrixSnapshot(
			new Matrix4()
				.fromArray(createTransformMatrix(transformField, instance.size))
				.multiply(new Matrix4().fromArray(instance.transform))
		),
	}))
}
