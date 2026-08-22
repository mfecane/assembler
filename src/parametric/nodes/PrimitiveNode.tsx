import type { NodeProps } from '@xyflow/react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
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
		<NodeSurface nodeId={id} dataId={`primitive-node-${id}`} actions={<GeometryNodeActions nodeId={id} />}>
			<NodePortRow nodeId={id} portId="material" valueType="materialInstance" direction="input" label="Material" />
			<NodePortGroup nodeId={id} portId="geometry" valueType="geometry"
				dataId={`primitive-fields-${id}`} className="flex flex-col gap-2">
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
			</NodePortGroup>
		</NodeSurface>
	)
}
