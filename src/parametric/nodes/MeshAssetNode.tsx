import { useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import {
	MeshAssetPickerDialog,
	MeshAssetPickerTrigger,
} from '@/parametric/components/MeshAssetPickerDialog'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { NodePortRow } from '@/parametric/components/NodePortRow'
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
			<NodeSurface nodeId={id} dataId={`mesh-asset-node-${id}`}
				actions={<GeometryNodeActions nodeId={id} />} className="min-w-52">
				<NodePortRow nodeId={id} portId="material" valueType="materialInstance" direction="input" label="Material" />
				<NodePortGroup nodeId={id} portId="geometry" valueType="geometry"
					dataId={`mesh-asset-fields-${id}`} className="flex flex-col gap-1.5">
					<MeshAssetPickerTrigger
						dataId={`mesh-asset-picker-trigger-${id}`}
						meshId={meshId.value}
						meshLabel={selectedMesh?.label}
						ariaLabel={`Select mesh for Mesh Asset node ${id}`}
						onClick={() => setSelectingMesh(true)}
					/>
					<EmbeddedTransformSection nodeId={id} />
				</NodePortGroup>
			</NodeSurface>

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
