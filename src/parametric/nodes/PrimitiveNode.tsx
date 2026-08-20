import { Position, type NodeProps } from '@xyflow/react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { Vec3Field } from '@/parametric/components/Vec3Field'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useField, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'
import type { PrimitiveKind } from '@/parametric/model/GraphNode'

const primitiveOptions: ReadonlyArray<{ value: PrimitiveKind; label: string }> = [
	{ value: 'box', label: 'Box' },
	{ value: 'sphere', label: 'Sphere' },
	{ value: 'cylinder', label: 'Cylinder' },
	{ value: 'cone', label: 'Cone' },
]

export function PrimitiveNode({ id }: NodeProps<ParametricFlowNode>) {
	const primitive = useField<PrimitiveKind>(id, 'primitive', 'box')
	const size = useVectorNumericFields(id, 'size', 'Size')

	return (
		<div
			data-id={`primitive-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle
				id="material"
				type="target"
				position={Position.Left}
				valueType="materialInstance"
				style={{ top: '65%' }}
			/>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2">
				<Select
					value={primitive.value}
					onValueChange={(next) => primitive.setValue(next as PrimitiveKind)}
				>
					<SelectTrigger className="nodrag h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
					{primitiveOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
					</SelectContent>
				</Select>
				<Vec3Field label="Size" fields={size} />
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
