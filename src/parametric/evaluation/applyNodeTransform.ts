import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { EvaluatedInstance, EvaluatedNodeOutputs } from '@/parametric/evaluation/EvaluationTypes'
import type { TransformState } from '@/parametric/model/TransformState'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function applyNodeTransform(
	nodeId: string,
	transform: TransformState,
	outputs: EvaluatedNodeOutputs
): EvaluatedNodeOutputs {
	return new Map([...outputs].map(([portId, output]) => {
		if (output.valueType !== 'geometry' || !Array.isArray(output.value)) return [portId, output]
		const instances = output.value as EvaluatedInstance[]
		const transformed = instances.map((instance) => ({
			...instance,
			instanceId: `${nodeId}/transformed/${instance.instanceId}`,
			matrix: createTransformMatrix(transform, instance.size).multiply(instance.matrix),
		}))
		const value = transform.getCopy()
			? [
				...instances.map((instance) => ({
					...instance,
					instanceId: `${nodeId}/original/${instance.instanceId}`,
				})),
				...transformed,
			]
			: transformed
		return [portId, { valueType: 'geometry', value }]
	}))
}

function createTransformMatrix(transformState: TransformState, size: Vector3Snapshot): Matrix4 {
	const rotation = transformState.getRotation().toSnapshot()
	const translation = transformState.getTranslation().toSnapshot()
	const scale = transformState.getScale().toSnapshot()
	const origin = transformState.getOrigin()
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

	return new Matrix4()
		.makeTranslation(translation.x, translation.y, translation.z)
		.multiply(new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
		.multiply(transform)
		.multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))
}

function getOriginOffset(origin: 'min' | 'middle' | 'max', size: number): number {
	if (origin === 'min') return -size / 2
	if (origin === 'max') return size / 2
	return 0
}
