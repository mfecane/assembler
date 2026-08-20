import { useEffect, useState, useSyncExternalStore } from 'react'
import { Copy, Eraser, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import { CreateGraphDialog } from '@/parametric/components/CreateGraphDialog'
import { GraphEditDialog } from '@/parametric/components/GraphEditDialog'
import { GraphTree } from '@/parametric/components/GraphTree'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { EditorController } from '@/parametric/editor/EditorController'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'

export function GraphAssemblyControls() {
	const controller = useEditorController()
	const [createGraphOpen, setCreateGraphOpen] = useState(false)

	return (
		<>
			<div data-id="graph-assembly-controls" className="flex min-w-0 items-center gap-1">
				<AssemblySelector
					controller={controller}
					onCreate={() => setCreateGraphOpen(true)}
				/>
			</div>
			<CreateGraphDialog
				open={createGraphOpen}
				onOpenChange={setCreateGraphOpen}
				onCreate={(name, root) => {
					if (root) controller.addRootGraph(name)
					else controller.addGraph(name)
				}}
			/>
		</>
	)
}

function AssemblySelector({
	controller,
	onCreate,
}: {
	controller: EditorController
	onCreate: () => void
}) {
	const { document, activeGraphId } = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot
	)
	const activeGraph = document.requireGraph(activeGraphId)
	const canRemoveGraph = controller.canRemoveGraph(activeGraphId)
	const isRootGraph = document.isRootGraph(activeGraphId)
	const isLastRootGraph = isRootGraph && document.getRootGraphs().length === 1
	const referencingGraphs = document.getGraphs().flatMap((graph) => {
		const instanceCount = graph.model.getNodes().filter(
			(node) => node instanceof GraphInstanceGraphNode && node.getGraphId() === activeGraphId
		).length
		return instanceCount > 0 ? [{ label: graph.label, instanceCount }] : []
	})
	const graphInstanceCount = referencingGraphs.reduce(
		(total, graph) => total + graph.instanceCount,
		0
	)
	const referencingGraphLabels = referencingGraphs
		.map((graph) => `“${graph.label}”`)
		.join(', ')
	const deleteDisabledReason = isLastRootGraph
		? `“${activeGraph.label}” is the project's only root assembly and cannot be deleted.`
		: !canRemoveGraph
			? [
				`“${activeGraph.label}” is used by ${graphInstanceCount}`,
				`instance${graphInstanceCount === 1 ? '' : 's'} in ${referencingGraphLabels}.`,
				`Remove ${graphInstanceCount === 1 ? 'that instance' : 'those instances'}`,
				'before deleting the assembly.',
			].join(' ')
			: 'Delete current assembly'
	const [actionMenuOpen, setActionMenuOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [confirmingClear, setConfirmingClear] = useState(false)
	const [confirmingRemove, setConfirmingRemove] = useState(false)

	useEffect(() => {
		setEditOpen(false)
		setActionMenuOpen(false)
		setConfirmingClear(false)
		setConfirmingRemove(false)
	}, [activeGraphId, activeGraph.label])

	return (
		<>
			<ButtonGroup
				data-id="active-assembly-controls"
				className="min-w-0"
				aria-label={`Current assembly: ${activeGraph.label}`}
			>
				<GraphTree controller={controller} disabled={false} />
				<Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
					<PopoverTrigger asChild>
						<Button
							data-id="assembly-actions-menu-button"
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 bg-muted/40 text-muted-foreground shadow-none"
							aria-label="Open assembly actions"
							aria-haspopup="menu"
						>
							<MoreHorizontal />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						data-id="assembly-actions-menu"
						align="end"
						className="w-52 p-1"
					>
						<div role="menu" aria-label={`Actions for ${activeGraph.label}`}>
							<Button
								data-id="add-graph-menu-item"
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal"
								role="menuitem"
								onClick={() => {
									setActionMenuOpen(false)
									onCreate()
								}}
							>
								<Plus />
								New…
							</Button>
							<Button
								data-id="edit-graph-menu-item"
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal"
								role="menuitem"
								onClick={() => {
									setActionMenuOpen(false)
									setEditOpen(true)
								}}
							>
								<Pencil />
								Edit graph…
							</Button>
							<Button
								data-id="copy-assembly-menu-item"
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal"
								role="menuitem"
								onClick={() => {
									setActionMenuOpen(false)
									controller.copyGraph(activeGraph.id)
								}}
							>
								<Copy />
								Copy assembly
							</Button>
							<Button
								data-id="clear-assembly-menu-item"
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal text-destructive hover:text-destructive"
								role="menuitem"
								onClick={() => {
									setActionMenuOpen(false)
									setConfirmingClear(true)
								}}
							>
								<Eraser />
								Clear assembly…
							</Button>
							<TooltipProvider delayDuration={300}>
								<Tooltip>
									<TooltipTrigger asChild>
										<span
											data-id="delete-assembly-tooltip-trigger"
											className="block"
											tabIndex={canRemoveGraph ? -1 : 0}
										>
											<Button
												data-id="delete-assembly-menu-item"
												type="button"
												variant="ghost"
												className="h-9 w-full justify-start px-2 font-normal text-destructive hover:text-destructive"
												role="menuitem"
												disabled={!canRemoveGraph}
												onClick={() => {
													setActionMenuOpen(false)
													setConfirmingRemove(true)
												}}
											>
												<Trash2 />
												Delete assembly
											</Button>
										</span>
									</TooltipTrigger>
									<TooltipContent side="right" className="max-w-80">
										{deleteDisabledReason}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</PopoverContent>
				</Popover>
			</ButtonGroup>
			<GraphEditDialog
				open={editOpen}
				graphId={activeGraph.id}
				graphLabel={activeGraph.label}
				isRoot={isRootGraph}
				isOnlyRoot={isLastRootGraph}
				configurationControlCount={
					isRootGraph ? document.getConfigurationControls(activeGraph.id).length : 0
				}
				onOpenChange={setEditOpen}
				onSave={(name, root) => controller.editGraph(activeGraph.id, name, root)}
			/>
			<ConfirmationDialog
				open={confirmingClear}
				title={`Clear "${activeGraph.label}"?`}
				message="All nodes and connections except the Output node will be removed."
				confirmLabel="Clear assembly"
				onCancel={() => setConfirmingClear(false)}
				onConfirm={() => {
					controller.clearGraph()
					setConfirmingClear(false)
				}}
			/>
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
		</>
	)
}
