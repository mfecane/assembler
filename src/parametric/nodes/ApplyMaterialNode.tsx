import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function ApplyMaterialNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<NodeSurface nodeId={id} dataId={`apply-material-node-${id}`}
			actions={<GeometryNodeActions nodeId={id} />} className="min-w-44">
			<NodePortGroup nodeId={id} portId="geometry" valueType="geometry"
				dataId={`apply-material-fields-${id}`} className="flex flex-col gap-1.5">
				<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="input" label="Geometry" />
				<NodePortRow nodeId={id} portId="material" valueType="materialInstance" direction="input" label="Material" />
			</NodePortGroup>
		</NodeSurface>
	)
}
