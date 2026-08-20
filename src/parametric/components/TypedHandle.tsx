import { Handle, type Position, useConnection, useNodeId } from '@xyflow/react'
import type { CSSProperties } from 'react'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { GraphValueType } from '@/parametric/model/GraphNode'

interface TypedHandleProps {
	id: string
	type: 'source' | 'target'
	position: Position
	valueType: GraphValueType
	style?: CSSProperties
}

export function TypedHandle({ id, type, position, valueType, style }: TypedHandleProps) {
	const nodeId = useNodeId()
	const connectionDragging = useConnection((connection) => connection.inProgress)
	const { model } = useGraphSnapshot()
	const component = nodeId
		? model.getEdges().find((edge) => edge.component && (type === 'target'
			? edge.targetNodeId === nodeId && edge.targetPort === id
			: edge.sourceNodeId === nodeId && edge.sourcePort === id)
		)?.component
		: undefined
	const node = nodeId ? model.getNode(nodeId) : undefined
	const connections = nodeId ? model.getEdges().filter((edge) => type === 'target'
		? edge.targetNodeId === nodeId && edge.targetPort === id
		: edge.sourceNodeId === nodeId && edge.sourcePort === id) : []

	return (
		<Tooltip open={connectionDragging ? false : undefined}>
			<TooltipTrigger asChild>
				<Handle
					id={id}
					data-id={`port-${nodeId ?? 'unknown'}-${id}`}
					data-component={component}
					type={type}
					position={position}
					className={`port-${valueType}`}
					style={style}
				/>
			</TooltipTrigger>
			<TooltipContent
				data-id={`port-tooltip-${nodeId ?? 'unknown'}-${id}`}
				className="max-w-96 space-y-1 text-xs"
				side={type === 'target' ? 'left' : 'right'}
			>
				<div className="font-medium">
					{type === 'target' ? 'Input' : 'Output'} · {node?.getName() ?? 'Unknown node'}
				</div>
				<div>
					Node: {model.getNodeTypeLabel(nodeId ?? '') ?? 'Unknown type'} ({nodeId ?? 'unknown'})
				</div>
				<div>Port: {id} ({valueType})</div>
				{connections.length === 0 ? (
					<div>Not connected</div>
				) : connections.map((edge) => {
					const otherNodeId = type === 'target' ? edge.sourceNodeId : edge.targetNodeId
					const otherPort = type === 'target' ? edge.sourcePort : edge.targetPort
					const otherNode = model.getNode(otherNodeId)
					const otherNodeType = model.getNodeTypeLabel(otherNodeId) ?? 'Unknown type'
					const otherValueType = otherPort
						? type === 'target'
							? model.getOutputPortValueType(otherNodeId, otherPort)
							: model.getInputPortValueType(otherNodeId, otherPort)
						: undefined
					return (
						<div key={edge.id}>
							{type === 'target' ? 'From' : 'To'}: {otherNode?.getName() ?? otherNodeId}
							 ({otherNodeType}, {otherNodeId}).{otherPort ?? 'unknown'}
							 ({otherValueType ?? 'unknown type'})
							{edge.component ? ` (${edge.component} component)` : ''}
						</div>
					)
				})}
			</TooltipContent>
		</Tooltip>
	)
}
