import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, Loader2, Pencil, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { GraphTree } from '@/parametric/components/GraphTree'
import type { GraphController } from '@/parametric/controller/GraphController'
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
	controller: GraphController
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
				<div className="flex min-w-0 items-center gap-3">
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
					<div className="h-6 w-px bg-border" aria-hidden="true" />
					<div
						data-id="project-assembly-controls"
						className="flex items-center gap-1"
					>
						<GraphTree controller={controller} />
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
		<div className="flex min-w-0 items-center gap-1">
			<h1
				data-id="project-name"
				className="m-0 max-w-64 truncate text-sm font-semibold text-foreground"
			>
				{name}
			</h1>
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							data-id="rename-project-button"
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground"
							disabled={disabled}
							aria-label="Rename project"
							onClick={() => setEditing(true)}
						>
							{pending ? <Loader2 className="animate-spin" /> : <Pencil />}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">Rename project</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
}
