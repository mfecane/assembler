import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useSumNode } from '@/parametric/hooks/useGraphNode'

export function SumNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useSumNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`sum-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="nodrag relative flex h-7 items-center justify-between gap-3">
					<TypedHandle
						id="enabled"
						type="target"
						position={Position.Left}
						valueType="boolean"
						style={{ top: '50%' }}
					/>
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">
						Enabled
					</Label>
					<Switch
						data-id="sum-enabled-switch"
						id={`${id}-enabled`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable constant"
					/>
				</div>
				<div className="nodrag flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Constant</span>
					<NumericInput
						field={{ value: binding.constant, setValue: binding.setConstant }}
					/>
				</div>
				<div className="relative flex h-7 items-center rounded border border-border bg-input px-2">
					<TypedHandle
						id="number"
						type="target"
						position={Position.Left}
						valueType="number"
						style={{ top: '50%' }}
					/>
					<span className={binding.inputConnected ? 'text-foreground' : 'text-muted-foreground'}>
						Numbers
					</span>
				</div>
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
