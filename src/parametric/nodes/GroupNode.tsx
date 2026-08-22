import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGroupNode } from '@/parametric/hooks/useGraphNode'

export function GroupNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGroupNode(id)
	return (
		<NodeSurface nodeId={id} dataId={`group-node-${id}`} actions={<GeometryNodeActions nodeId={id} />}>
			<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="both" label="Geometry">
				<span>{binding.connectedInputCount} connected</span>
			</NodePortRow>
		</NodeSurface>
	)
}
