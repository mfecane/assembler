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
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useMeshAssetNode } from '@/parametric/hooks/useGraphNode'

export function MeshAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useMeshAssetNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`mesh-asset-node-${id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<Select value={binding.meshId} onValueChange={binding.setMeshId}>
				<SelectTrigger
					className="nodrag h-8 px-2 text-xs"
					aria-label="Mesh asset"
				>
					<SelectValue placeholder="Select mesh" />
				</SelectTrigger>
				<SelectContent>
					{binding.availableMeshes.map((mesh) => (
						<SelectItem key={mesh.id} value={mesh.id}>{mesh.label}</SelectItem>
					))}
				</SelectContent>
			</Select>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
