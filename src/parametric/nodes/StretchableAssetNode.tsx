import { useMemo, useState } from 'react'
import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import {
	MeshAssetPickerDialog,
	MeshAssetPickerTrigger,
} from '@/parametric/components/MeshAssetPickerDialog'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { NumericInput } from '@/parametric/components/NumericInput'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useField, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'

export function StretchableAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const [selectingMesh, setSelectingMesh] = useState(false)
	const controller = useEditorController()
	const meshId = useField(id, 'meshId', '')
	const targetSize = useVectorNumericFields(id, 'targetSize', 'Stretch')
	const selectedMesh = controller.getSelectableMeshes().find((mesh) => mesh.id === meshId.value)
	const stretchAxes = useMemo(
		() => controller.getStretchableAssetAxes(meshId.value),
		[controller, meshId.value]
	)

	return (
		<>
			<div
				data-id={`stretchable-asset-node-${id}`}
				className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
			>
				<TypedHandle
					id="material"
					type="target"
					position={Position.Left}
					valueType="materialInstance"
					style={{ top: '26%' }}
				/>
				<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
				<MeshAssetPickerTrigger
					dataId={`stretchable-asset-picker-trigger-${id}`}
					meshId={meshId.value}
					meshLabel={selectedMesh?.label}
					ariaLabel={`Select mesh for Stretchable Asset node ${id}`}
					onClick={() => setSelectingMesh(true)}
				/>
				<div data-id={`stretchable-asset-size-inputs-${id}`} className="flex flex-col gap-1.5 py-2">
					{stretchAxes.map((axis) => (
						<div
							key={axis}
							data-id={`stretchable-asset-${axis}-input-${id}`}
							className="nodrag relative flex items-center justify-between gap-3"
						>
							<TypedHandle
								id={`stretch${axis.toUpperCase()}`}
								type="target"
								position={Position.Left}
								valueType="number"
							/>
							<Label className="text-xs text-muted-foreground">
								Stretch <AxisLabel axis={axis} />
							</Label>
							<NumericInput
								value={targetSize[axis].value}
								min={0.000001}
								onValueChange={targetSize[axis].setValue}
							/>
						</div>
					))}
				</div>
				<EmbeddedTransformSection nodeId={id} />
				<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
			</div>

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
