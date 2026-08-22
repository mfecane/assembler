import { Position } from '@xyflow/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { GraphValueType } from '@/parametric/model/GraphNode'

interface NodePortRowProps {
	nodeId: string
	portId: string
	valueType: GraphValueType
	label?: ReactNode
	direction: 'input' | 'output' | 'both'
	children?: ReactNode
	className?: string
}

export function NodePortRow({
	nodeId,
	portId,
	valueType,
	label,
	direction,
	children,
	className,
}: NodePortRowProps) {
	const hasInput = direction !== 'output'
	const hasOutput = direction !== 'input'

	return (
		<div
			data-id={`node-port-row-${nodeId}-${direction}-${portId}`}
			className={cn(
				'nodrag relative -mx-3 flex min-h-7 items-center gap-2 px-3 text-muted-foreground',
				direction === 'output' && 'justify-end',
				className
			)}
		>
			{hasInput && (
				<TypedHandle id={portId} type="target" position={Position.Left} valueType={valueType} />
			)}
			{label && <span className="min-w-0 truncate">{label}</span>}
			{children && <div className={cn('min-w-0', label ? 'ml-auto' : 'flex-1')}>{children}</div>}
			{hasOutput && (
				<TypedHandle id={portId} type="source" position={Position.Right} valueType={valueType} />
			)}
		</div>
	)
}
