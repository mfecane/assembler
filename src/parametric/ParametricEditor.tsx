import { Background, Controls, ReactFlow, SelectionMode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ResizableSplitView } from '@/components/ResizableSplitView'
import { GraphToolbar } from '@/parametric/components/GraphToolbar'
import { useFlowGraph } from '@/parametric/hooks/useFlowGraph'
import { ThreeViewport } from '@/parametric/three/ThreeViewport'
import type { Editor } from '@/parametric/editor/Editor'
import { EditorProvider } from '@/parametric/editor/react/EditorContext'
import { nodeViewTypes } from '@/parametric/nodes/nodeViewRegistry'
import { cn } from '@/lib/utils'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { useEditorShortcuts } from '@/parametric/editor/react/useEditorShortcuts'

function ParametricEditorContent() {
	useEditorShortcuts()
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
					selectionMode={SelectionMode.Partial}
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
	editor,
	className,
}: {
	editor: Editor
	className?: string
}) {
	return (
		<div data-id="parametric-editor" className={cn('h-screen w-screen', className)}>
			<EditorProvider editor={editor}>
				<ParametricEditorContent />
			</EditorProvider>
		</div>
	)
}
