import { Position, type NodeProps } from '@xyflow/react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'

export function GraphInstanceNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useGraphController()
	const { document, model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof GraphInstanceGraphNode)) return null
	const graph = document.getGraph(node.getGraphId())
	if (!graph) return null

	return (
		<div
			className="min-w-52 rounded-md border border-primary/50 bg-surface px-3 py-2 shadow-md"
			onDoubleClick={() => controller.openGraph(graph.id)}
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<div>
					<div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
						Assembly instance
					</div>
					<div className="text-sm font-semibold text-foreground">{graph.label}</div>
				</div>
				<div className="flex items-center">
					{graph.output.valueType === 'geometry' && (
						<GeometryPreviewButton nodeId={id} />
					)}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="nodrag nopan h-6 w-6 text-muted-foreground"
						title={`Open ${graph.label}`}
						aria-label={`Open ${graph.label}`}
						onClick={() => controller.openGraph(graph.id)}
					>
						<ExternalLink />
					</Button>
					<NodeDeleteButton nodeId={id} nodeLabel={graph.label} />
				</div>
			</div>
			<div className="flex flex-col gap-1.5">
				{graph.inputs.length === 0 ? (
					<div className="text-[11px] text-muted-foreground">No inputs</div>
				) : graph.inputs.map((input, index) => (
					<div key={input.id} className="relative text-[11px] text-muted-foreground">
						<TypedHandle
							id={input.id}
							type="target"
							position={Position.Left}
							valueType={input.valueType}
							style={{ top: 54 + index * 24 }}
						/>
						<span>{input.label}</span>
						<span className="ml-1 opacity-60">{input.valueType}</span>
					</div>
				))}
			</div>
			<TypedHandle
				id={graph.output.id}
				type="source"
				position={Position.Right}
				valueType={graph.output.valueType}
			/>
		</div>
	)
}
