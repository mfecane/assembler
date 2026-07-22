import { Position, type NodeProps } from '@xyflow/react'
import { Input } from '@/components/ui/input'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useColorNode } from '@/parametric/hooks/useGraphNode'

export function ColorNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useColorNode(id)
	if (!binding) return null

	return (
		<div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Color</div>
				<NodeDeleteButton nodeId={id} nodeLabel="Color" />
			</div>
			<div className="flex flex-col gap-2">
				<Input
					className="nodrag h-8 px-2 text-xs"
					value={binding.label}
					onChange={(event) => binding.setLabel(event.target.value)}
					aria-label="Color label"
					placeholder="Label"
				/>
				<PresetColorSelect value={binding.color} onValueChange={binding.setColor} />
			</div>
			<TypedHandle id="color" type="source" position={Position.Right} valueType="color" />
		</div>
	)
}
