import { useMemo, useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import {
	MeshAssetPickerDialog,
	MeshAssetPickerTrigger,
} from '@/parametric/components/MeshAssetPickerDialog'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useConnectedInputPorts, useField, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'

export function StretchableAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const [selectingMesh, setSelectingMesh] = useState(false)
	const controller = useEditorController()
	const meshId = useField(id, 'meshId', '')
	const targetSize = useVectorNumericFields(id, 'targetSize', 'Stretch')
	const connectedInputs = useConnectedInputPorts(id)
	const selectedMesh = controller.getSelectableMeshes().find((mesh) => mesh.id === meshId.value)
	const stretchAxes = useMemo(
		() => controller.getStretchableAssetAxes(meshId.value),
		[controller, meshId.value]
	)

	return (
		<>
			<NodeSurface nodeId={id} dataId={`stretchable-asset-node-${id}`}
				actions={<GeometryNodeActions nodeId={id} />} className="min-w-56">
				<NodePortRow nodeId={id} portId="material" valueType="materialInstance" direction="input" label="Material" />
				<NodePortGroup nodeId={id} portId="geometry" valueType="geometry"
					dataId={`stretchable-asset-fields-${id}`} className="flex flex-col gap-1.5">
					<MeshAssetPickerTrigger
						dataId={`stretchable-asset-picker-trigger-${id}`}
						meshId={meshId.value}
						meshLabel={selectedMesh?.label}
						ariaLabel={`Select mesh for Stretchable Asset node ${id}`}
						onClick={() => setSelectingMesh(true)}
					/>
					<div data-id={`stretchable-asset-size-inputs-${id}`} className="flex flex-col gap-1.5 py-2">
						{stretchAxes.map((axis) => (
							<NodePortRow
							key={axis}
							nodeId={id}
							portId={`stretch${axis.toUpperCase()}`}
							valueType="number"
							direction="input"
							label={<Label className="text-xs text-muted-foreground">
								Stretch <AxisLabel axis={axis} />
							</Label>}
							>
								<NumericInput
								value={targetSize[axis].value}
								min={0.000001}
								disabled={connectedInputs.has(`stretch${axis.toUpperCase()}`)}
								onValueChange={targetSize[axis].setValue}
								/>
							</NodePortRow>
						))}
					</div>
					<EmbeddedTransformSection nodeId={id} />
				</NodePortGroup>
			</NodeSurface>

			<MeshAssetPickerDialog
				open={selectingMesh}
				onOpenChange={setSelectingMesh}
				onSelect={(nextMeshId) => controller.setStretchableAssetMesh(id, nextMeshId)}
				selectedMeshId={meshId.value}
				stretchableOnly
				title="Select stretchable asset"
				description={
					`Select a registered mesh for Stretchable Asset node "${id}". `
					+ 'Stretch sizes reset to the selected asset’s natural metadata size.'
				}
			/>
		</>
	)
}
