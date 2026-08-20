import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function ApplyMaterialNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<div
			data-id={`apply-material-node-${id}`}
			className="min-w-44 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle
				id="geometry"
				type="target"
				position={Position.Left}
				valueType="geometry"
				style={{ top: '35%' }}
			/>
			<TypedHandle
				id="material"
				type="target"
				position={Position.Left}
				valueType="materialInstance"
				style={{ top: '65%' }}
			/>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<p data-id={`apply-material-node-description-${id}`} className="mb-0 text-xs text-muted-foreground">
				Assign material to geometry
			</p>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
