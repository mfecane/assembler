import { Position, type NodeProps } from '@xyflow/react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useMeshAssetNode } from '@/parametric/hooks/useGraphNode'

export function MeshAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useMeshAssetNode(id)
	if (!binding) return null

	return (
		<div className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Mesh Asset</div>
				<GeometryNodeActions nodeId={id} nodeLabel="Mesh Asset" />
			</div>
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
