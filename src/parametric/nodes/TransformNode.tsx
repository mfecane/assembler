import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { TransformSection } from '@/parametric/components/TransformSection'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function TransformNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<div
			data-id={`transform-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Transform</div>
				<GeometryNodeActions nodeId={id} nodeLabel="Transform" />
			</div>
			<TransformSection nodeId={id} defaultOpen />
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
