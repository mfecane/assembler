import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useMaterialNode } from '@/parametric/hooks/useGraphNode'

export function MaterialNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useMaterialNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`material-node-${id}`}
			className="min-w-44 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle
				id="geometry"
				type="target"
				position={Position.Left}
				valueType="geometry"
				style={{ top: '35%' }}
			/>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} nodeLabel="Material" />} />
			<div className="nodrag relative">
				<TypedHandle
					id="color"
					type="target"
					position={Position.Left}
					valueType="color"
					style={{ top: '50%' }}
				/>
				<PresetColorSelect
					value={binding.color}
					onValueChange={binding.setColor}
					disabled={binding.colorConnected}
				/>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
