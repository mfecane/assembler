import { Position, type NodeProps } from '@xyflow/react'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useColorNode } from '@/parametric/hooks/useGraphNode'

export function ColorNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useColorNode(id)
	if (!binding) return null

	return (
		<div data-id={`color-node-${id}`} className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<NodeHeader nodeId={id} actions={<NodeDeleteButton nodeId={id} nodeLabel="Color" />} />
			<div className="flex flex-col gap-2">
				<PresetColorSelect value={binding.color} onValueChange={binding.setColor} />
			</div>
			<TypedHandle id="color" type="source" position={Position.Right} valueType="color" />
		</div>
	)
}
