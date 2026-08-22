import { Position } from '@xyflow/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { GraphValueType } from '@/parametric/model/GraphNode'

interface NodePortGroupProps {
	nodeId: string
	portId: string
	valueType: GraphValueType
	children: ReactNode
	dataId: string
	className?: string
}

export function NodePortGroup({
	nodeId,
	portId,
	valueType,
	children,
	dataId,
	className,
}: NodePortGroupProps) {
	return (
		<div data-id={dataId} data-node-id={nodeId} className={cn('nodrag relative -mx-3 px-3', className)}>
			{children}
			<TypedHandle id={portId} type="source" position={Position.Right} valueType={valueType} />
		</div>
	)
}
