import { Position, type NodeProps } from '@xyflow/react'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useField } from '@/parametric/hooks/useGraphNode'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'

export function ColorNode({ id }: NodeProps<ParametricFlowNode>) {
	const color = useField(id, 'color', defaultMaterialColor)

	return (
		<div data-id={`color-node-${id}`} className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<NodeHeader nodeId={id} />
			<div className="flex flex-col gap-2">
				<PresetColorSelect value={color.value} onValueChange={color.setValue} />
			</div>
			<TypedHandle id="color" type="source" position={Position.Right} valueType="color" />
		</div>
	)
}
