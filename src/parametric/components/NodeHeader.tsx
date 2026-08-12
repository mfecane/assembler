import type { ReactNode } from 'react'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NodeActionsMenu } from '@/parametric/components/NodeActionsMenu'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { getNodeColorCategory } from '@/parametric/nodes/nodeColorCoding'
import { nodeViewPresentation } from '@/parametric/nodes/nodeViewRegistry'

export function NodeHeader({
	nodeId,
	actions,
}: {
	nodeId: string
	actions?: ReactNode
}) {
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const presentation = node ? nodeViewPresentation[node.type] : undefined
	const Icon = presentation?.icon ?? Circle

	if (!node) return null
	const colorCategory = getNodeColorCategory(node.type)

	return (
		<div
			data-id={`node-header-${nodeId}`}
			className={cn(
				'graph-node-header -mx-3 -mt-2 mb-2 flex min-w-0 items-center justify-between gap-2',
				'rounded-t-sm px-3 py-2 text-gray-900',
				`graph-node-header-${colorCategory}`
			)}
		>
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				<Icon
					data-id={`node-type-icon-${nodeId}`}
					className="size-4 shrink-0 text-current"
					aria-label={`${presentation?.description ?? node.type} node type`}
				/>
				<div
					data-id={`node-name-${nodeId}`}
					className="min-w-0 truncate text-sm font-semibold text-current"
					title={node.getName()}
				>
					{node.getName()}
				</div>
			</div>
			<div data-id={`node-header-actions-${nodeId}`} className="flex shrink-0 items-center gap-0.5">
				{actions}
				<NodeActionsMenu nodeId={nodeId} />
			</div>
		</div>
	)
}
