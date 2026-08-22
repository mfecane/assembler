import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useChoiceToMeshMapNode } from '@/parametric/hooks/useGraphNode'

export function ChoiceToMeshMapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useChoiceToMeshMapNode(id)
	if (!binding) return null

	return (
		<NodeSurface
			nodeId={id}
			dataId={`choice-to-mesh-map-node-${id}`}
			actions={<GeometryNodeActions nodeId={id} />}
			className="min-w-56"
		>
			<NodePortRow nodeId={id} portId="enum" valueType="enum" direction="input" label="Choice" />
			<NodePortGroup
				nodeId={id}
				portId="geometry"
				valueType="geometry"
				dataId={`choice-to-mesh-map-options-${id}`}
				className="flex flex-col gap-2 text-xs"
			>
				{binding.mappings.map((mapping) => (
					<NodePortRow
						key={mapping.id}
						nodeId={id}
						portId={mapping.id}
						valueType="geometry"
						direction="input"
						label={binding.availableEnumOptions[mapping.enumIndex] ?? `Choice ${mapping.enumIndex + 1}`}
					/>
				))}
				{binding.mappings.length === 0 && (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						Connect a choice output to configure mappings.
					</div>
				)}
			</NodePortGroup>
		</NodeSurface>
	)
}
