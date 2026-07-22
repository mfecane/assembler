import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'

export function GeometryNodeActions({
	nodeId,
	nodeLabel,
}: {
	nodeId: string
	nodeLabel: string
}) {
	return (
		<div className="flex items-center gap-0.5">
			<GeometryPreviewButton nodeId={nodeId} />
			<NodeDeleteButton nodeId={nodeId} nodeLabel={nodeLabel} />
		</div>
	)
}
