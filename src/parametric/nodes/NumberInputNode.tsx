import { Position, type NodeProps } from '@xyflow/react'
import { Input } from '@/components/ui/input'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useNumberInputNode } from '@/parametric/hooks/useGraphNode'

export function NumberInputNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useNumberInputNode(id)
	if (!binding) return null

	return (
		<div className="min-w-44 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<div className="mb-2 flex items-center justify-between gap-2 pr-3">
				<div className="text-sm font-semibold text-foreground">Number</div>
				<NodeDeleteButton nodeId={id} nodeLabel="Number" />
			</div>
			<div className="flex flex-col gap-2 text-xs">
				<Input
					className="nodrag h-8 px-2 text-xs"
					value={binding.label}
					onChange={(event) => binding.setLabel(event.target.value)}
					aria-label="Number label"
					placeholder="Label"
				/>
				<DraftNumberInput
					value={binding.value}
					onValueChange={binding.setValue}
					step={0.1}
					className="nodrag h-8 px-2 text-xs"
				/>
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
