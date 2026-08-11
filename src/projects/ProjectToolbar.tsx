import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
	ArrowLeft,
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	Eraser,
	FolderKanban,
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
	Save,
	Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserMenu } from '@/auth/UserMenu'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import { GraphEditDialog } from '@/parametric/components/GraphEditDialog'
import { GraphTree } from '@/parametric/components/GraphTree'
import type { EditorController } from '@/parametric/editor/EditorController'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'
import type { User } from '@supabase/supabase-js'

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

export function ProjectToolbar({
	name,
	user,
	saveState,
	saveError,
	controller,
	projectRenamePending,
	projectRenameError,
	saveAsPending,
	saveAsError,
	navigationDisabled,
	onBack,
	onSave,
	onPrepareSaveAs,
	onSaveAs,
	onRename,
	onSignOut,
}: {
	name: string
	user: User
	saveState: SaveState
	saveError: string | null
	controller: EditorController
	projectRenamePending: boolean
	projectRenameError: string | null
	saveAsPending: boolean
	saveAsError: string | null
	navigationDisabled: boolean
	onBack: () => void
	onSave: () => void
	onPrepareSaveAs: () => void
	onSaveAs: (name: string) => void
	onRename: (name: string) => void
	onSignOut: () => void
}) {
	const saveDisabled = projectRenamePending || saveState === 'saving' || saveAsPending
	const [saveMenuOpen, setSaveMenuOpen] = useState(false)
	const [saveAsOpen, setSaveAsOpen] = useState(false)
	const [saveAsName, setSaveAsName] = useState(`${name} copy`)

	const openSaveAs = () => {
		setSaveAsName(`${name} copy`)
		onPrepareSaveAs()
		setSaveMenuOpen(false)
		setSaveAsOpen(true)
	}

	const submitSaveAs = () => {
		const normalizedName = saveAsName.trim()
		if (!normalizedName || saveAsPending) return
		onSaveAs(normalizedName)
	}

	return (
		<>
			<header
				data-id="project-toolbar"
				className="flex min-h-14 items-center justify-between gap-4 border-b border-border bg-surface px-3"
			>
				<div className="flex min-w-0 items-center gap-2">
					<Button
						data-id="project-back-button"
						type="button"
						size="sm"
						variant="ghost"
						disabled={navigationDisabled}
						onClick={onBack}
					>
						<ArrowLeft />
						Back
					</Button>
					<div data-id="project-identity" className="flex min-w-0 items-center gap-2 px-1">
						<FolderKanban
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden="true"
						/>
						<div className="min-w-0">
							<ProjectName
								name={name}
								disabled={projectRenamePending || saveState === 'saving'}
								pending={projectRenamePending}
								onRename={onRename}
							/>
							{projectRenameError && (
								<details
									data-id="project-rename-error-details"
									className="relative text-xs"
									open
								>
									<summary className="cursor-pointer text-danger underline underline-offset-2">
										Project rename error details
									</summary>
									<pre className="absolute left-0 top-full z-50 mt-2 max-h-80 w-[min(40rem,calc(100vw-1.5rem))] overflow-auto whitespace-pre-wrap rounded-md border border-danger/40 bg-surface p-3 text-left text-xs text-foreground shadow-lg">
										{projectRenameError}
									</pre>
								</details>
							)}
							{saveState === 'failed' && saveError && (
								<details data-id="project-save-error-details" className="relative text-xs">
									<summary className="cursor-pointer text-danger underline underline-offset-2">
										Save error details
									</summary>
									<pre className="absolute left-0 top-full z-50 mt-2 max-h-80 w-[min(40rem,calc(100vw-1.5rem))] overflow-auto whitespace-pre-wrap rounded-md border border-danger/40 bg-surface p-3 text-left text-xs text-foreground shadow-lg">
										{saveError}
									</pre>
								</details>
							)}
						</div>
					</div>
					<ChevronRight
						className="size-4 shrink-0 text-muted-foreground/60"
						aria-hidden="true"
					/>
					<div
						data-id="project-assembly-controls"
						className="flex items-center gap-1"
					>
						<AssemblyHeaderControls
							controller={controller}
							disabled={projectRenamePending || saveState === 'saving'}
						/>
						<Button
							data-id="add-root-graph-button"
							type="button"
							variant="outline"
							size="sm"
							disabled={projectRenamePending || saveState === 'saving'}
							onClick={() => controller.addRootGraph()}
						>
							<Plus />
							New root
						</Button>
						<Button
							data-id="add-graph-button"
							type="button"
							variant="outline"
							size="sm"
							disabled={projectRenamePending || saveState === 'saving'}
							onClick={() => controller.addGraph()}
						>
							<Plus />
							New assembly
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div data-id="project-save-controls" className="flex items-center">
						<Button
							data-id="project-save-button"
							type="button"
							size="sm"
							className="rounded-r-none"
							disabled={saveDisabled}
							aria-keyshortcuts="Control+S Meta+S"
							title="Save now (Ctrl/Cmd+S)"
							onClick={onSave}
						>
							{saveState === 'saving' ? (
								<Loader2 className="animate-spin" />
							) : saveState === 'saved' ? (
								<Check />
							) : (
								<Save />
							)}
							{saveState === 'saving'
								? 'Saving…'
								: saveState === 'saved'
									? 'Saved'
									: saveState === 'failed'
										? 'Retry'
										: saveState === 'dirty'
											? 'Save now'
											: 'Save'}
						</Button>
						<Popover open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
							<PopoverTrigger asChild>
								<Button
									data-id="project-save-menu-button"
									type="button"
									size="sm"
									className="w-8 rounded-l-none border-l border-primary-foreground/25 px-0"
									disabled={saveState === 'saving' || projectRenamePending || saveAsPending}
									aria-label="Open save menu"
									aria-haspopup="menu"
								>
									<ChevronDown className="size-3.5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								data-id="project-save-menu"
								align="end"
								className="w-48 p-1"
							>
								<div role="menu" aria-label="Project save actions">
									<Button
										data-id="project-save-as-menu-item"
										type="button"
										variant="ghost"
										className="h-9 w-full justify-start px-2 font-normal"
										role="menuitem"
										onClick={openSaveAs}
									>
										<Copy />
										Save as…
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					</div>
					<div className="h-6 w-px bg-border" aria-hidden="true" />
					<UserMenu
						user={user}
						disabled={saveState === 'saving' || projectRenamePending || saveAsPending}
						onSignOut={onSignOut}
					/>
				</div>
			</header>
			<Dialog
				open={saveAsOpen}
				onOpenChange={(open) => {
					if (!saveAsPending) setSaveAsOpen(open)
				}}
			>
				<DialogContent data-id="save-project-as-dialog" className="sm:max-w-md">
					<form
						data-id="save-project-as-form"
						onSubmit={(event) => {
							event.preventDefault()
							submitSaveAs()
						}}
					>
						<DialogHeader>
							<DialogTitle>Save project as</DialogTitle>
							<DialogDescription>
								Create a copy of “{name}” with its current assemblies and edits.
							</DialogDescription>
						</DialogHeader>
						<Input
							data-id="save-project-as-name-input"
							value={saveAsName}
							maxLength={120}
							aria-label="Copied project name"
							className="mt-4"
							disabled={saveAsPending}
							onChange={(event) => setSaveAsName(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							autoFocus
						/>
						{saveAsError && (
							<details
								data-id="save-project-as-error-details"
								className="mt-3 text-xs"
								open
							>
								<summary className="cursor-pointer text-danger underline underline-offset-2">
									Save as error details
								</summary>
								<pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-danger/40 bg-surface p-3 text-left text-xs text-foreground">
									{saveAsError}
								</pre>
							</details>
						)}
						<DialogFooter className="mt-6">
							<Button
								data-id="cancel-save-project-as-button"
								type="button"
								variant="outline"
								disabled={saveAsPending}
								onClick={() => setSaveAsOpen(false)}
							>
								Cancel
							</Button>
							<Button
								data-id="confirm-save-project-as-button"
								type="submit"
								disabled={!saveAsName.trim() || saveAsPending}
							>
								{saveAsPending ? <Loader2 className="animate-spin" /> : <Copy />}
								{saveAsPending ? 'Creating copy…' : 'Create copy'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	)
}

function AssemblyHeaderControls({
	controller,
	disabled,
}: {
	controller: EditorController
	disabled: boolean
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
	const deleteDisabledReason = isLastRootGraph
		? `“${activeGraph.label}” is the project's only root assembly and cannot be deleted.`
		: !canRemoveGraph
			? `“${activeGraph.label}” is used by ${graphInstanceCount} instance${graphInstanceCount === 1 ? '' : 's'} in ${referencingGraphs.map((graph) => `“${graph.label}”`).join(', ')}. Remove ${graphInstanceCount === 1 ? 'that instance' : 'those instances'} before deleting the assembly.`
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

	const openEdit = () => {
		setActionMenuOpen(false)
		setEditOpen(true)
	}

	return (
		<>
			<ButtonGroup
				data-id="active-assembly-header-controls"
				className="min-w-0"
				aria-label={`Current assembly: ${activeGraph.label}`}
			>
				<GraphTree controller={controller} disabled={disabled} />
				<Popover open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
					<PopoverTrigger asChild>
						<Button
							data-id="assembly-actions-menu-button"
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 bg-muted/40 text-muted-foreground shadow-none"
							disabled={disabled}
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
								data-id="edit-graph-menu-item"
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal"
								role="menuitem"
								onClick={openEdit}
							>
								<Pencil />
								Edit graph…
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

function ProjectName({
	name,
	disabled,
	pending,
	onRename,
}: {
	name: string
	disabled: boolean
	pending: boolean
	onRename: (name: string) => void
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(name)
	const cancelBlurCommit = useRef(false)

	useEffect(() => {
		setDraft(name)
		setEditing(false)
	}, [name])

	const commit = () => {
		if (cancelBlurCommit.current) {
			cancelBlurCommit.current = false
			setDraft(name)
			setEditing(false)
			return
		}
		const normalizedName = draft.trim()
		if (!normalizedName || normalizedName === name) {
			setDraft(name)
			setEditing(false)
			return
		}
		onRename(normalizedName)
		setEditing(false)
	}

	if (editing) {
		return (
			<Input
				data-id="project-name-input"
				value={draft}
				maxLength={120}
				aria-label="Project name"
				className="h-8 w-56 text-sm font-semibold"
				onChange={(event) => setDraft(event.target.value)}
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
						setDraft(name)
						event.currentTarget.blur()
					}
				}}
				autoFocus
			/>
		)
	}

	return (
		<div data-id="project-name-display" className="flex min-w-0 items-center gap-1">
			<h1
				data-id="project-name"
				className="m-0 max-w-64 cursor-text truncate text-sm font-semibold text-foreground"
				title={disabled ? name : `${name} — double-click to rename`}
				onDoubleClick={() => {
					if (!disabled) setEditing(true)
				}}
			>
				{name}
			</h1>
			{pending && (
				<Loader2
					data-id="project-rename-pending-indicator"
					className="size-3.5 animate-spin text-muted-foreground"
					aria-label="Renaming project"
				/>
			)}
		</div>
	)
}
