import type { NodeProps } from '@xyflow/react'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { NumericInput } from '@/parametric/components/NumericInput'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useConnectedInputPorts, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'

const axes = ['x', 'y', 'z'] as const

export function Vector3Node({ id }: NodeProps<ParametricFlowNode>) {
	const value = useVectorNumericFields(id, 'value', 'Value')
	const connectedInputs = useConnectedInputPorts(id)

	return (
		<NodeSurface nodeId={id} dataId={`vector3-node-${id}`}>
			<NodePortGroup
				nodeId={id}
				portId="vector3"
				valueType="vector3"
				dataId={`vector3-inputs-${id}`}
				className="flex flex-col gap-1.5"
			>
				{axes.map((axis) => (
					<NodePortRow
						key={axis}
						nodeId={id}
						portId={axis}
						valueType="number"
						direction="input"
						label={<AxisLabel axis={axis} />}
					>
						<NumericInput value={value[axis].value} onValueChange={value[axis].setValue}
							disabled={connectedInputs.has(axis)} />
					</NodePortRow>
				))}
			</NodePortGroup>
		</NodeSurface>
	)
}
