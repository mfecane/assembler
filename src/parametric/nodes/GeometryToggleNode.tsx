import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGeometryToggleNode } from '@/parametric/hooks/useGraphNode'

export function GeometryToggleNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGeometryToggleNode(id)
	if (!binding) return null

	return (
		<NodeSurface nodeId={id} dataId={`geometry-toggle-node-${id}`} actions={<GeometryNodeActions nodeId={id} />} className="min-w-48">
			<div className="flex flex-col gap-2 text-xs">
				<NodePortRow nodeId={id} portId="enabled" valueType="boolean" direction="input" label={(
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">
						Enabled
					</Label>
				)}>
					<Switch
						id={`${id}-enabled`}
						data-id={`geometry-toggle-enabled-${id}`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable geometry"
					/>
				</NodePortRow>
				<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="both" label="Geometry" />
			</div>
		</NodeSurface>
	)
}
