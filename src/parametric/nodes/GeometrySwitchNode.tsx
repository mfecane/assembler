import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGeometrySwitchNode } from '@/parametric/hooks/useGraphNode'

export function GeometrySwitchNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGeometrySwitchNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`geometry-switch-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div
					data-id={`geometry-switch-choice-${id}`}
					className="relative flex h-7 items-center rounded border border-border bg-input px-2"
				>
					<TypedHandle id="choice" type="target" position={Position.Left} valueType="enum" />
					<span className="text-muted-foreground">Choice</span>
				</div>
				<span className="text-muted-foreground">Geometry cases</span>
				{binding.cases.map((switchCase) => (
					<div
						key={switchCase.id}
						data-id={`geometry-switch-case-${id}-${switchCase.id}`}
						className="relative flex h-7 items-center rounded border border-border bg-input px-2"
					>
						<TypedHandle
							id={switchCase.id}
							type="target"
							position={Position.Left}
							valueType="geometry"
						/>
						<span className="truncate text-foreground" title={switchCase.enumValue}>
							{switchCase.enumValue}
						</span>
					</div>
				))}
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
