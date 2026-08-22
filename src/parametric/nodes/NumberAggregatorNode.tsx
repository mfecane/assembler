import type { NodeProps } from '@xyflow/react'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import {
	useNumericField,
	useConnectedInputPorts,
	useRepeatZoneMembership,
} from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function NumberAggregatorNode({ id }: NodeProps<ParametricFlowNode>) {
	const initialValue = useNumericField(id, 'initialValue', 'Initial Value')
	const addValue = useNumericField(id, 'addValue', 'Add Value')
	const insideRepeatZone = useRepeatZoneMembership(id)
	const connectedInputs = useConnectedInputPorts(id)

	return (
		<NodeSurface nodeId={id} dataId={`number-aggregator-node-${id}`} className="min-w-52">
			{!insideRepeatZone && (
				<div
					data-id={`number-aggregator-zone-warning-${id}`}
					className={cn(
						'mb-2 flex items-center gap-1.5 rounded border border-amber-400/40',
						'bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200'
					)}
				>
					<TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
					Move inside a Repeat Zone
				</div>
			)}
			<NodePortGroup nodeId={id} portId="currentValue" valueType="number"
				dataId={`number-aggregator-fields-${id}`}
				className="flex flex-col gap-2 text-xs text-muted-foreground">
				<NumberAggregatorInput
					nodeId={id}
					id="initialValue"
					label="Initial Value"
					value={initialValue.value}
					onValueChange={initialValue.setValue}
					disabled={connectedInputs.has('initialValue')}
				/>
				<NumberAggregatorInput
					nodeId={id}
					id="addValue"
					label="Add Value"
					value={addValue.value}
					onValueChange={addValue.setValue}
					disabled={connectedInputs.has('addValue')}
				/>
			</NodePortGroup>
		</NodeSurface>
	)
}

function NumberAggregatorInput({
	nodeId,
	id,
	label,
	value,
	onValueChange,
	disabled,
}: {
	nodeId: string
	id: 'initialValue' | 'addValue'
	label: string
	value: number
	onValueChange: (value: number) => void
	disabled: boolean
}) {
	return (
		<NodePortRow nodeId={nodeId} portId={id} valueType="number" direction="input" label={label}>
			<NumericInput value={value} onValueChange={onValueChange} disabled={disabled} />
		</NodePortRow>
	)
}
