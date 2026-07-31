import { Position, type NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useSumNode } from '@/parametric/hooks/useGraphNode'

export function SumNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useSumNode(id)
	if (!binding) return null

	return (
		<div data-id={`sum-node-${id}`} className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<NodeHeader nodeId={id} actions={<NodeDeleteButton nodeId={id} nodeLabel="Sum" />} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="nodrag flex items-center justify-between gap-2">
					<span className="text-muted-foreground">Constant</span>
					<NumericInput
						field={{ value: binding.constant, setValue: binding.setConstant }}
					/>
				</div>
				<div className="flex flex-col gap-1">
					{binding.inputPorts.map((port, index) => (
						<div
							key={port.id}
							className="relative flex h-7 items-center rounded border border-border bg-input px-2"
						>
							<TypedHandle
								id={port.id}
								type="target"
								position={Position.Left}
								valueType="number"
								style={{ top: '50%' }}
							/>
							<span className={port.connected ? 'text-foreground' : 'text-muted-foreground'}>
								Input {index + 1}
							</span>
						</div>
					))}
				</div>
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
