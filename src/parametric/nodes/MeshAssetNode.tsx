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
import { useField } from '@/parametric/hooks/useGraphNode'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function MeshAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const [selectingMesh, setSelectingMesh] = useState(false)
	const controller = useEditorController()
	const meshId = useField(id, 'meshId', '')
	const selectedMesh = controller.getSelectableMeshes().find((mesh) => mesh.id === meshId.value)

	return (
		<>
			<div
				data-id={`mesh-asset-node-${id}`}
				className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
			>
				<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
				<MeshAssetPickerTrigger
					dataId={`mesh-asset-picker-trigger-${id}`}
					meshId={meshId.value}
					meshLabel={selectedMesh?.label}
					ariaLabel={`Select mesh for Mesh Asset node ${id}`}
					onClick={() => setSelectingMesh(true)}
				/>
				<EmbeddedTransformSection nodeId={id} />
				<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
			</div>

			<MeshAssetPickerDialog
				open={selectingMesh}
				onOpenChange={setSelectingMesh}
				onSelect={meshId.setValue}
				selectedMeshId={meshId.value}
				title="Select mesh asset"
				description={`Select a registered mesh for Mesh Asset node "${id}". Its transform will be preserved.`}
			/>
		</>
	)
}
