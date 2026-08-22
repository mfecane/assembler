import type { NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import {
	useConnectedInputPorts,
	useField,
	useNumericField,
} from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import type { PrimitiveArrayElementType } from '@/parametric/model/GraphNode'

export function GetNthElementNode({ id }: NodeProps<ParametricFlowNode>) {
	const index = useNumericField(id, 'index', 'Index')
	const elementType = useField<PrimitiveArrayElementType>(id, 'elementType', 'number').value
	const connectedInputs = useConnectedInputPorts(id)

	return (
		<NodeSurface nodeId={id} dataId={`get-nth-element-node-${id}`} className="min-w-52">
			<NodePortGroup
				nodeId={id}
				portId="value"
				valueType={elementType}
				dataId={`get-nth-element-fields-${id}`}
				className="flex flex-col gap-2 text-xs text-muted-foreground"
			>
				<NodePortRow nodeId={id} portId="values" valueType="primitiveArray" direction="input" label="Values" />
				<NodePortRow nodeId={id} portId="index" valueType="number" direction="input" label="Index">
					<NumericInput
						value={index.value}
						onValueChange={index.setValue}
						min={0}
						step={1}
						disabled={connectedInputs.has('index')}
					/>
				</NodePortRow>
			</NodePortGroup>
		</NodeSurface>
	)
}
