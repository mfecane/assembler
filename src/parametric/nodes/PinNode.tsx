import { Position, type NodeProps } from '@xyflow/react'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function PinNode({ id, data }: NodeProps<ParametricFlowNode>) {
	if (!data.valueType) {
		throw new Error(`Cannot render Pin node "${id}": its React Flow data has no value type.`)
	}

	return (
		<div
			data-id={`pin-node-${id}`}
			className="h-5 w-5 rounded-full border border-border bg-surface shadow-md"
		>
			<TypedHandle id="value" type="target" position={Position.Left} valueType={data.valueType} />
			<TypedHandle id="value" type="source" position={Position.Right} valueType={data.valueType} />
		</div>
	)
}
