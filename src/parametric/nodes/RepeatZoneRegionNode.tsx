import type { NodeProps } from '@xyflow/react'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function RepeatZoneRegionNode({ id, data }: NodeProps<ParametricFlowNode>) {
	const width = typeof data.width === 'number' ? data.width : 0
	const height = typeof data.height === 'number' ? data.height : 0

	return (
		<div
			data-id={`repeat-zone-region-${id}`}
			className="rounded-lg border border-amber-400/50 bg-amber-500/10"
			style={{ width, height }}
		>
			<div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
				Repeat Zone
			</div>
		</div>
	)
}
