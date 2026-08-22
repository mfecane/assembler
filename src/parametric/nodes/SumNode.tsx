import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useSumNode } from '@/parametric/hooks/useGraphNode'

export function SumNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useSumNode(id)
	if (!binding) return null

	return (
		<NodeSurface nodeId={id} dataId={`sum-node-${id}`}>
			<NodePortGroup nodeId={id} portId="number" valueType="number"
				dataId={`sum-fields-${id}`} className="flex flex-col gap-2 text-xs">
				<NodePortRow nodeId={id} portId="enabled" valueType="boolean" direction="input" label={(
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">
						Enabled
					</Label>
				)}>
					<Switch
						data-id="sum-enabled-switch"
						id={`${id}-enabled`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable constant"
					/>
				</NodePortRow>
				<div className="nodrag flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Constant</span>
					<NumericInput
						value={binding.constant}
						onValueChange={binding.setConstant}
					/>
				</div>
				<NodePortRow
					nodeId={id}
					portId="number"
					valueType="number"
					direction="input"
					label="Numbers"
					className={binding.inputConnected ? 'text-foreground' : undefined}
				/>
			</NodePortGroup>
		</NodeSurface>
	)
}
