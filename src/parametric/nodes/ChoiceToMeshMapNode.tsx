import { Position, type NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useChoiceToMeshMapNode } from '@/parametric/hooks/useGraphNode'

export function ChoiceToMeshMapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useChoiceToMeshMapNode(id)
	if (!binding) return null

	return (
		<div
			data-id={`choice-to-mesh-map-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div
					data-id={`choice-to-mesh-map-choice-${id}`}
					className="relative flex h-7 items-center rounded border border-border bg-input px-2"
				>
					<TypedHandle id="enum" type="target" position={Position.Left} valueType="enum" />
					<span className="text-muted-foreground">Choice</span>
				</div>
				<span className="text-muted-foreground">Mesh inputs</span>
				{binding.mappings.map((mapping) => (
					<div
						key={mapping.id}
						data-id={`choice-to-mesh-map-input-${id}-${mapping.id}`}
						className="relative flex h-7 items-center rounded border border-border bg-input px-2"
					>
						<TypedHandle
							id={mapping.id}
							type="target"
							position={Position.Left}
							valueType="geometry"
						/>
						<span
							className="truncate text-foreground"
							title={binding.availableEnumOptions[mapping.enumIndex]}
						>
							{binding.availableEnumOptions[mapping.enumIndex]}
						</span>
					</div>
				))}
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
