import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function RepeatOutputNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<NodeSurface nodeId={id} dataId={`repeat-output-node-${id}`} actions={<GeometryNodeActions nodeId={id} />} className="min-w-48">
			<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="both" label="Geometry" />
		</NodeSurface>
	)
}
