import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NodeHeader } from '@/parametric/components/NodeHeader'

interface NodeSurfaceProps {
	nodeId: string
	dataId: string
	children: ReactNode
	actions?: ReactNode
	className?: string
}

export function NodeSurface({ nodeId, dataId, children, actions, className }: NodeSurfaceProps) {
	return (
		<div
			data-id={dataId}
			className={cn(
				'min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md',
				className
			)}
		>
			<NodeHeader nodeId={nodeId} actions={actions} />
			<div data-id={`${dataId}-content`} className="flex flex-col gap-1.5 text-xs">
				{children}
			</div>
		</div>
	)
}
