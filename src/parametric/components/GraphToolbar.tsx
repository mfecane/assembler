import { Panel, type Edge } from '@xyflow/react'
import { Redo2, Undo2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { NodeSelector } from '@/parametric/components/NodeSelector'
import { useGraphActions } from '@/parametric/hooks/useGraphActions'
import { AssetHelperDialog } from '@/parametric/components/AssetHelperDialog'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useReactBridgeSnapshot } from '@/parametric/editor/react/EditorContext'
import { GraphAssemblyControls } from '@/parametric/components/GraphAssemblyControls'

export function GraphToolbar({ selectedEdges }: { selectedEdges: Edge[] }) {
	const { removeEdges } = useGraphActions()
	const controller = useEditorController()
	const { canUndo, canRedo } = useReactBridgeSnapshot()

	return (
		<>
			<Panel position="top-left">
				<div
					data-id="graph-toolbar"
					role="toolbar"
					aria-label="Assembly tools"
					className="nodrag nopan flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-md"
				>
					<TooltipProvider delayDuration={300}>
						<GraphAssemblyControls />
						<Separator orientation="vertical" className="h-5" />
						<div data-id="graph-history-tools" className="flex items-center gap-1">
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex">
										<Button
											data-id="undo-graph-change-button"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground"
											disabled={!canUndo}
											aria-label="Undo graph change"
											aria-keyshortcuts="Control+Z Meta+Z"
											onClick={() => controller.undo()}
										>
											<Undo2 />
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent side="top">Undo</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex">
										<Button
											data-id="redo-graph-change-button"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground"
											disabled={!canRedo}
											aria-label="Redo graph change"
											aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
											onClick={() => controller.redo()}
										>
											<Redo2 />
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent side="top">Redo</TooltipContent>
							</Tooltip>
						</div>
						<Separator orientation="vertical" className="h-5" />
						<div
							data-id="graph-creation-tools"
							className="flex items-center gap-1"
						>
							<NodeSelector selectedEdges={selectedEdges} />
							<AssetHelperDialog />
						</div>
						{selectedEdges.length > 0 && (
							<>
								<Separator orientation="vertical" className="h-5" />
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											data-id="delete-selected-connections-button"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											aria-label={`Delete ${selectedEdges.length} selected connection${selectedEdges.length === 1 ? '' : 's'}`}
											onClick={() => removeEdges(selectedEdges.map((edge) => edge.id))}
										>
											<Unlink />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										Delete selected connection{selectedEdges.length === 1 ? '' : 's'}
									</TooltipContent>
								</Tooltip>
							</>
						)}
					</TooltipProvider>
				</div>
			</Panel>
		</>
	)
}
