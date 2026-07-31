import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'

export function GeometryNodeActions({
	nodeId,
}: {
	nodeId: string
}) {
	return <GeometryPreviewButton nodeId={nodeId} />
}
