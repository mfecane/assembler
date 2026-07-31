import { applyNodeTransform } from '@/parametric/evaluation/applyNodeTransform'
import type { GraphNode } from '@/parametric/model/GraphNode'
import type { NodeCapabilityDefinition, NumericFieldDefinition } from '@/parametric/model/NodeDefinition'
import { TransformState } from '@/parametric/model/TransformState'
import { Vector3Value } from '@/parametric/model/Vector3Value'

export interface TransformCapabilityOwner {
	readonly transform: TransformState
}

export function transformCapability<
	TNode extends GraphNode & TransformCapabilityOwner,
>(): NodeCapabilityDefinition<TNode> {
	return {
		id: 'transform',
		getState: (node) => node.transform,
		serialize: (node) => node.transform.toSnapshot(),
		deserialize: (node, value, context) => {
			node.transform.replace(TransformState.from(value, context))
		},
		numericFields: {
			...vectorFields('translation', (node) => node.transform.getTranslation(), (node, value) => {
				node.transform.setTranslation(value)
			}),
			...vectorFields('rotation', (node) => node.transform.getRotation(), (node, value) => {
				node.transform.setRotation(value)
			}),
			...vectorFields('scale', (node) => node.transform.getScale(), (node, value) => {
				node.transform.setScale(value)
			}),
		},
		applyOutputs: (node, outputs) => applyNodeTransform(node.id, node.transform, outputs),
	}
}

function vectorFields<TNode extends GraphNode>(
	prefix: 'translation' | 'rotation' | 'scale',
	getValue: (node: TNode) => Vector3Value,
	setValue: (node: TNode, value: Vector3Value) => void
): Record<string, NumericFieldDefinition<TNode>> {
	return Object.fromEntries((['x', 'y', 'z'] as const).map((axis) => [
		`${prefix}.${axis}`,
		{
			get: (node: TNode) => getValue(node)[axis],
			set: (node: TNode, value: number) => {
				const current = getValue(node)
				setValue(node, new Vector3Value(
					axis === 'x' ? value : current.x,
					axis === 'y' ? value : current.y,
					axis === 'z' ? value : current.z
				))
			},
		},
	]))
}
