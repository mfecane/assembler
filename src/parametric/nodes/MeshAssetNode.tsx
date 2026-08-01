import { Position, type NodeProps } from '@xyflow/react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useField } from '@/parametric/hooks/useGraphNode'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function MeshAssetNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const meshId = useField(id, 'meshId', '')
	const availableMeshes = controller.getSelectableMeshes()

	return (
		<div
			data-id={`mesh-asset-node-${id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<Select value={meshId.value} onValueChange={meshId.setValue}>
				<SelectTrigger
					className="nodrag h-8 px-2 text-xs"
					aria-label="Mesh asset"
				>
					<SelectValue placeholder="Select mesh" />
				</SelectTrigger>
				<SelectContent>
					{availableMeshes.map((mesh) => (
						<SelectItem key={mesh.id} value={mesh.id}>{mesh.label}</SelectItem>
					))}
				</SelectContent>
			</Select>
			<EmbeddedTransformSection nodeId={id} />
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
