import type { NodeProps } from '@xyflow/react'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

const axes = ['x', 'y', 'z'] as const

export function Vector3ComponentsNode({ id }: NodeProps<ParametricFlowNode>) {
	return (
		<NodeSurface nodeId={id} dataId={`vector3-components-node-${id}`}>
			<div data-id={`vector3-components-outputs-${id}`} className="flex flex-col gap-1.5">
				<NodePortRow nodeId={id} portId="vector3" valueType="vector3" direction="input" label="Vector 3" />
				{axes.map((axis) => (
					<NodePortRow
						key={axis}
						nodeId={id}
						portId={axis}
						valueType="number"
						direction="output"
						label={<AxisLabel axis={axis} />}
					/>
				))}
			</div>
		</NodeSurface>
	)
}
