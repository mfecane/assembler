import type { NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { useConnectedInputPorts, useNumericField } from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function RepeatInputNode({ id }: NodeProps<ParametricFlowNode>) {
	const instances = useNumericField(id, 'instances', 'Instances')
	const connectedInputs = useConnectedInputPorts(id)

	return (
		<NodeSurface nodeId={id} dataId={`repeat-input-node-${id}`} className="min-w-48">
			<NodePortRow nodeId={id} portId="instances" valueType="number" direction="input" label="Instances">
				<NumericInput
					value={instances.value}
					onValueChange={instances.setValue}
					min={0}
					step={1}
					roundStep={1}
					disabled={connectedInputs.has('instances')}
				/>
			</NodePortRow>
			<NodePortRow nodeId={id} portId="iteration" valueType="number" direction="output" label="Iteration" />
		</NodeSurface>
	)
}
