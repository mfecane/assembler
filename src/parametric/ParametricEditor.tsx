import { Background, Controls, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ResizableSplitView } from '@/components/ResizableSplitView'
import { GraphToolbar } from '@/parametric/components/GraphToolbar'
import { useFlowGraph } from '@/parametric/hooks/useFlowGraph'
import { ThreeViewport } from '@/parametric/three/ThreeViewport'
import {
	GraphEditorProvider,
	type GraphEditorServices,
} from '@/parametric/controller/GraphEditorContext'
import { defaultGraphEditorServices } from '@/parametric/controller/createDefaultGraphController'
import { nodeViewTypes } from '@/parametric/nodes/nodeViewRegistry'
import { cn } from '@/lib/utils'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

function ParametricEditorContent() {
	const { selectedEdges, ...flowGraph } = useFlowGraph()
	const { activeGraphId } = useGraphSnapshot()

	return (
		<ResizableSplitView
			className="h-full w-full"
			first={
				<ReactFlow
					key={activeGraphId}
					{...flowGraph}
					data-id="graph-view"
					nodeTypes={nodeViewTypes}
					deleteKeyCode={null}
					fitView
					maxZoom={4}
					minZoom={0.2}
				>
					<GraphToolbar selectedEdges={selectedEdges} />
					<Background />
					<Controls />
				</ReactFlow>
			}
			second={
			<div className="h-full">
				<ThreeViewport />
			</div>
			}
		/>
	)
}

export function ParametricEditor({
	services = defaultGraphEditorServices,
	className,
}: {
	services?: GraphEditorServices
	className?: string
}) {
	return (
		<div className={cn('h-screen w-screen', className)}>
			<GraphEditorProvider services={services}>
				<ParametricEditorContent />
			</GraphEditorProvider>
		</div>
	)
}
