import { useEffect, useRef, useState } from 'react'
import { Panel, type Edge } from '@xyflow/react'
import { Eraser, Redo2, Settings2, Trash2, Undo2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import { NodeSelector } from '@/parametric/components/NodeSelector'
import { useGraphActions } from '@/parametric/hooks/useGraphActions'
import { ConfigurationPanelEditorDialog } from '@/parametric/components/ConfigurationPanelEditorDialog'
import { GraphJsonControls } from '@/parametric/components/GraphJsonControls'
import { AssetHelperDialog } from '@/parametric/components/AssetHelperDialog'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useReactBridgeSnapshot } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function GraphToolbar({ selectedEdges }: { selectedEdges: Edge[] }) {
	const [confirmingClear, setConfirmingClear] = useState(false)
	const [confirmingRemove, setConfirmingRemove] = useState(false)
	const [editingInterface, setEditingInterface] = useState(false)
	const { clearGraph, removeEdge } = useGraphActions()
	const controller = useEditorController()
	const { canUndo, canRedo } = useReactBridgeSnapshot()
	const { document, activeGraphId } = useGraphSnapshot()
	const activeGraph = document.requireGraph(activeGraphId)
	const isEntryGraph = activeGraphId === document.getEntryGraphId()
	const canRemoveGraph = controller.canRemoveGraph(activeGraphId)

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
						<div className="h-5 w-px bg-border" aria-hidden="true" />
						<div
							data-id="graph-creation-tools"
							className="flex items-center gap-1"
						>
							<NodeSelector selectedEdges={selectedEdges} />
							<AssetHelperDialog />
						</div>
						<div className="h-5 w-px bg-border" aria-hidden="true" />
						<div
							data-id="graph-identity-tools"
							className="flex items-center gap-1"
						>
							<EditableAssemblyName
								graphId={activeGraph.id}
								graphName={activeGraph.label}
								onRename={(name) => controller.renameGraph(activeGraph.id, name)}
							/>
							{isEntryGraph && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											data-id="open-configuration-panel-editor"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground"
											aria-label="Edit configuration panel"
											onClick={() => setEditingInterface(true)}
										>
											<Settings2 />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">Edit configuration panel</TooltipContent>
								</Tooltip>
							)}
						</div>
						{selectedEdges.length > 0 && (
							<>
								<div className="h-5 w-px bg-border" aria-hidden="true" />
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											data-id="delete-selected-connections-button"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											aria-label={`Delete ${selectedEdges.length} selected connection${selectedEdges.length === 1 ? '' : 's'}`}
											onClick={() => selectedEdges.forEach((edge) => removeEdge(edge.id))}
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
						<div className="h-5 w-px bg-border" aria-hidden="true" />
						<div
							data-id="graph-destructive-tools"
							className="flex items-center gap-1"
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										data-id="clear-assembly-button"
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
										aria-label="Clear current assembly"
										onClick={() => setConfirmingClear(true)}
									>
										<Eraser />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top">Clear current assembly</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex">
										<Button
											data-id="delete-graph-button"
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											aria-label="Delete current assembly"
											disabled={!canRemoveGraph}
											onClick={() => setConfirmingRemove(true)}
										>
											<Trash2 />
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent side="top">
									{isEntryGraph
										? 'The entry assembly cannot be deleted'
										: canRemoveGraph
											? 'Delete current assembly'
											: 'Remove this assembly from all instances before deleting it'}
								</TooltipContent>
							</Tooltip>
						</div>
						<div className="h-5 w-px bg-border" aria-hidden="true" />
						<GraphJsonControls />
					</TooltipProvider>
				</div>
			</Panel>
			<ConfirmationDialog
				open={confirmingRemove}
				title={`Delete "${activeGraph.label}"?`}
				message="The assembly and all of its nodes and connections will be permanently removed."
				confirmLabel="Delete assembly"
				onCancel={() => setConfirmingRemove(false)}
				onConfirm={() => {
					controller.removeGraph(activeGraph.id)
					setConfirmingRemove(false)
				}}
			/>
			<ConfirmationDialog
				open={confirmingClear}
				title="Clear assembly?"
				message="All nodes and connections except the Output node will be removed."
				confirmLabel="Clear assembly"
				onCancel={() => setConfirmingClear(false)}
				onConfirm={() => {
					clearGraph()
					setConfirmingClear(false)
				}}
			/>
			<ConfigurationPanelEditorDialog
				open={isEntryGraph && editingInterface}
				onClose={() => setEditingInterface(false)}
			/>
		</>
	)
}

function EditableAssemblyName({
	graphId,
	graphName,
	onRename,
}: {
	graphId: string
	graphName: string
	onRename: (name: string) => void
}) {
	const [name, setName] = useState(graphName)
	const [editing, setEditing] = useState(false)
	const cancelBlurCommit = useRef(false)

	useEffect(() => {
		setName(graphName)
		setEditing(false)
	}, [graphId, graphName])

	const commit = () => {
		if (cancelBlurCommit.current) {
			cancelBlurCommit.current = false
			setName(graphName)
			setEditing(false)
			return
		}
		const normalizedName = name.trim()
		if (!normalizedName) {
			setName(graphName)
			setEditing(false)
			return
		}
		if (normalizedName !== graphName) onRename(normalizedName)
		setName(normalizedName)
		setEditing(false)
	}

	if (!editing) {
		return (
			<span
				data-id="active-assembly-name"
				className="max-w-40 cursor-text truncate px-2 text-xs font-medium text-foreground"
				title={`${graphName} — double-click to rename`}
				onDoubleClick={() => setEditing(true)}
			>
				{graphName}
			</span>
		)
	}

	return (
		<Input
			data-id="active-graph-name-input"
			value={name}
			aria-label="Current assembly name"
			className="nodrag nopan h-8 w-40 border-transparent bg-transparent px-2 text-xs font-medium shadow-none hover:border-input focus:border-input"
			onChange={(event) => setName(event.target.value)}
			onBlur={commit}
			onFocus={(event) => event.currentTarget.select()}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault()
					event.currentTarget.blur()
				}
				if (event.key === 'Escape') {
					event.preventDefault()
					cancelBlurCommit.current = true
					setName(graphName)
					event.currentTarget.blur()
				}
			}}
			autoFocus
		/>
	)
}
