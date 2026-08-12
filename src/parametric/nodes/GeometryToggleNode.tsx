import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGeometryToggleNode } from '@/parametric/hooks/useGraphNode'

export function GeometryToggleNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGeometryToggleNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`geometry-toggle-node-${id}`}
			className="min-w-48 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="nodrag relative flex h-7 items-center justify-between gap-3">
					<TypedHandle id="enabled" type="target" position={Position.Left} valueType="boolean" />
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">
						Enabled
					</Label>
					<Switch
						id={`${id}-enabled`}
						data-id={`geometry-toggle-enabled-${id}`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable geometry"
					/>
				</div>
				<div className="relative flex h-7 items-center rounded border border-border bg-input px-2">
					<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
					<span className="text-muted-foreground">Geometry</span>
				</div>
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
