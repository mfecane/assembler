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
import { useMeshSelectorNode } from '@/parametric/hooks/useGraphNode'

export function MeshSelectorNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useMeshSelectorNode(id)
	if (!binding) return null

	const setMeshForValue = (enumValue: string, meshId: string) => {
		const existingSelection = binding.selections.find(
			(selection) => selection.enumValue === enumValue
		)
		binding.setSelections(existingSelection
			? binding.selections.map((selection) =>
				selection.enumValue === enumValue ? { ...selection, meshId } : selection
			)
			: [...binding.selections, { enumValue, meshId }]
		)
	}

	return (
		<div className="min-w-60 rounded-md border border-border bg-surface px-3 py-2 shadow-md">
			<TypedHandle id="enum" type="target" position={Position.Left} valueType="enum" />
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="text-sm font-semibold text-foreground">Mesh Selector</div>
				<GeometryNodeActions nodeId={id} nodeLabel="Mesh Selector" />
			</div>
			<div className="flex flex-col gap-1.5">
				{binding.availableEnumValues.map((enumValue) => {
					const selection = binding.selections.find(
						(candidate) => candidate.enumValue === enumValue
					)
					return (
					<div key={enumValue} className="nodrag flex items-center gap-1 text-xs">
						<span className="w-24 truncate px-2 text-foreground" title={enumValue}>
							{enumValue}
						</span>
						<span className="text-muted-foreground">→</span>
						<Select
							value={selection?.meshId}
							onValueChange={(meshId) => setMeshForValue(enumValue, meshId)}
						>
							<SelectTrigger
								className="h-7 min-w-24 flex-1 px-2 text-xs"
								aria-label={`Mesh for ${enumValue}`}
							>
								<SelectValue placeholder="Select mesh" />
							</SelectTrigger>
							<SelectContent>
							{binding.availableMeshes.map((mesh) => (
								<SelectItem key={mesh.id} value={mesh.id}>{mesh.label}</SelectItem>
							))}
							</SelectContent>
						</Select>
					</div>
					)
				})}
				{binding.availableEnumValues.length === 0 && (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						Connect an enum output to configure mappings.
					</div>
				)}
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
