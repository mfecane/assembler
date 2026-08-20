import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEffect, useState } from 'react'
import type { ConnectionTooltipBinding } from '@/parametric/hooks/useFlowGraph'

export function ConnectionTooltip({
	edgeId,
	position,
	source,
	sourcePort,
	sourceValueType,
	target,
	targetPort,
	targetValueType,
	component,
}: ConnectionTooltipBinding) {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		setVisible(false)
		const timeout = window.setTimeout(() => setVisible(true), 300)
		return () => window.clearTimeout(timeout)
	}, [edgeId])

	return (
		<Tooltip open={visible}>
			<TooltipTrigger asChild>
				<span
					aria-hidden="true"
					className="pointer-events-none fixed size-px"
					style={{ left: position.x, top: position.y }}
				/>
			</TooltipTrigger>
			<TooltipContent
				data-id="connection-tooltip"
				className="max-w-96 space-y-1 text-xs"
				side="top"
				sideOffset={8}
			>
				<div className="font-medium">Connection</div>
				<div>Edge: {edgeId}</div>
				<div>Output: {source}.{sourcePort} ({sourceValueType})</div>
				<div>Input: {target}.{targetPort} ({targetValueType})</div>
				{component && <div>Vector3 component: {component}</div>}
			</TooltipContent>
		</Tooltip>
	)
}
