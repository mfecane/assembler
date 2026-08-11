import { useState } from 'react'
import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import {
	MeshAssetPickerDialog,
	MeshAssetPickerTrigger,
} from '@/parametric/components/MeshAssetPickerDialog'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useMeshSelectorNode } from '@/parametric/hooks/useGraphNode'

export function MeshSelectorNode({ id }: NodeProps<ParametricFlowNode>) {
	const [editingEnumValue, setEditingEnumValue] = useState<string | null>(null)
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
	const selectMeshForEditingValue = (meshId: string) => {
		if (editingEnumValue === null) {
			throw new Error(
				`Cannot update Mesh Selector node "${id}": the mesh picker returned asset ` +
					`"${meshId}" without an active choice mapping row`
			)
		}
		setMeshForValue(editingEnumValue, meshId)
	}
	const editingSelection = binding.selections.find(
		(selection) => selection.enumValue === editingEnumValue
	)

	return (
		<>
			<div
				data-id={`mesh-selector-node-${id}`}
				className="min-w-60 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
			>
				<TypedHandle id="enum" type="target" position={Position.Left} valueType="enum" />
				<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
				<div data-id={`mesh-selector-mappings-${id}`} className="flex flex-col gap-1.5">
					{binding.availableEnumValues.map((enumValue, index) => {
						const selection = binding.selections.find(
							(candidate) => candidate.enumValue === enumValue
						)
						const selectedMesh = binding.availableMeshes.find(
							(mesh) => mesh.id === selection?.meshId
						)
						return (
							<div
								key={enumValue}
								data-id={`mesh-selector-mapping-${id}-${index}`}
								className="nodrag flex items-center gap-1 text-xs"
							>
								<span className="w-24 truncate px-2 text-foreground" title={enumValue}>
									{enumValue}
								</span>
								<span className="text-muted-foreground">→</span>
								<MeshAssetPickerTrigger
									dataId={`mesh-selector-picker-trigger-${id}-${index}`}
									meshId={selection?.meshId}
									meshLabel={selectedMesh?.label}
									ariaLabel={`Select mesh for choice ${enumValue} on Mesh Selector node ${id}`}
									className="h-7 min-w-24 flex-1"
									onClick={() => setEditingEnumValue(enumValue)}
								/>
							</div>
						)
					})}
					{binding.availableEnumValues.length === 0 && (
						<div className="px-2 py-1 text-xs text-muted-foreground">
							Connect a choice output to configure mappings.
						</div>
					)}
				</div>
				<EmbeddedTransformSection nodeId={id} />
				<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
			</div>

			<MeshAssetPickerDialog
				open={editingEnumValue !== null}
				onOpenChange={(open) => {
					if (!open) setEditingEnumValue(null)
				}}
				onSelect={selectMeshForEditingValue}
				selectedMeshId={editingSelection?.meshId}
				title={editingEnumValue ? `Select mesh for ${editingEnumValue}` : 'Select mesh'}
				description={editingEnumValue
					? `Select a registered mesh for choice "${editingEnumValue}" on Mesh Selector node "${id}".`
					: `Select a registered mesh for Mesh Selector node "${id}".`}
			/>
		</>
	)
}
