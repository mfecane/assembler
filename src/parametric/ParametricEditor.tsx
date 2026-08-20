import { Background, Controls, ReactFlow, SelectionMode, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ResizableSplitView } from '@/components/ResizableSplitView'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GraphToolbar } from '@/parametric/components/GraphToolbar'
import { ConnectionTooltip } from '@/parametric/components/ConnectionTooltip'
import { VectorComponentSelector } from '@/parametric/components/VectorComponentSelector'
import { useFlowGraph, type ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { ThreeViewport } from '@/parametric/three/ThreeViewport'
import type { Editor } from '@/parametric/editor/Editor'
import { EditorProvider, useReactBridgeSnapshot } from '@/parametric/editor/react/EditorContext'
import { nodeViewTypes } from '@/parametric/nodes/nodeViewRegistry'
import { cn } from '@/lib/utils'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { useEditorShortcuts } from '@/parametric/editor/react/useEditorShortcuts'
import { ConfiguratorPanel } from '@/parametric/components/ConfiguratorPanel'

function ParametricEditorContent() {
	useEditorShortcuts()
	const { activeGraphId } = useGraphSnapshot()
	const { previewNodeId } = useReactBridgeSnapshot()

	return (
		<div data-id="graph-editor-workspace" className="h-full min-h-0">
			<ResizableSplitView
				className="h-full"
				first={<GraphCanvas key={activeGraphId} />}
				second={
					<div data-id="parametric-viewport-workspace" className="flex h-full min-w-0">
						<div className="min-w-0 flex-1">
							<ThreeViewport />
						</div>
						{!previewNodeId && <ConfiguratorPanel />}
					</div>
				}
			/>
		</div>
	)
}

function GraphCanvas() {
	const {
		selectedEdges,
		componentSelector,
		connectionTooltip,
		...flowGraph
	} = useFlowGraph()

	return (
		<ReactFlow<ParametricFlowNode, Edge>
			{...flowGraph}
			data-id="graph-view"
			nodeTypes={nodeViewTypes}
			deleteKeyCode={['Backspace', 'Delete']}
			fitView
			maxZoom={4}
			minZoom={0.2}
			panActivationKeyCode={null}
			selectionMode={SelectionMode.Partial}
		>
			<GraphToolbar selectedEdges={selectedEdges} />
			{componentSelector && <VectorComponentSelector {...componentSelector} />}
			{connectionTooltip && <ConnectionTooltip {...connectionTooltip} />}
			<Background />
			<Controls />
		</ReactFlow>
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
		<div
			id="graph-editor-panel"
			data-id="parametric-editor"
			role="tabpanel"
			aria-labelledby="graph-editor-tab"
			className={cn('h-screen w-screen', className)}
		>
			<TooltipProvider>
				<EditorProvider editor={editor}>
					<ParametricEditorContent />
				</EditorProvider>
			</TooltipProvider>
		</div>
	)
}
