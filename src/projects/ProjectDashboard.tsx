import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { FolderOpen, Plus, Trash2, UserRound } from 'lucide-react'
import { UserMenu } from '@/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Client } from '@/cosntants'
import { createDefaultEditor } from '@/parametric/editor/createEditor'
import type { ProjectRepository } from '@/projects/ProjectRepository'
import type { ProjectSummary } from '@/projects/projectTypes'

export function ProjectDashboard({
	user,
	repository,
	onOpen,
	onSignOut,
}: {
	user: User
	repository: ProjectRepository
	onOpen: (projectId: string) => void
	onSignOut: () => void
}) {
	const [projects, setProjects] = useState<ProjectSummary[]>([])
	const [name, setName] = useState('')
	const [client, setClient] = useState(Client.MAXSHELF)
	const [isLoading, setIsLoading] = useState(true)
	const [isCreating, setIsCreating] = useState(false)
	const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null)
	const [error, setError] = useState<string | null>(null)

	const loadProjects = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			setProjects(await repository.list())
		} catch (cause) {
			setError(errorMessage(cause, 'Projects could not be loaded.'))
		} finally {
			setIsLoading(false)
		}
	}, [repository])

	useEffect(() => {
		void loadProjects()
	}, [loadProjects])

	const createProject = async () => {
		const trimmedName = name.trim()
		if (!trimmedName) return
		setIsCreating(true)
		setError(null)
		try {
			const editor = createDefaultEditor(client)
			const document = editor.controller.exportGraph()
			editor.dispose()
			const project = await repository.create(trimmedName, document)
			onOpen(project.id)
		} catch (cause) {
			setError(errorMessage(cause, 'The project could not be created.'))
			setIsCreating(false)
		}
	}

	const deleteProject = async () => {
		if (!deleteTarget) return
		const target = deleteTarget
		setDeleteTarget(null)
		setError(null)
		try {
			await repository.remove(target.id)
			setProjects((current) => current.filter((project) => project.id !== target.id))
		} catch (cause) {
			setError(errorMessage(cause, 'The project could not be deleted.'))
		}
	}

	return (
		<main data-id="project-dashboard" className="min-h-full">
			<header className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
					<div>
						<p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
							Assembler
						</p>
						<h1 className="mb-0 mt-1 text-xl font-semibold">Projects</h1>
					</div>
					<UserMenu user={user} onSignOut={onSignOut} />
				</div>
			</header>

			<div className="mx-auto max-w-5xl p-6">
				<form
					data-id="create-project-form"
					className="mb-8 flex max-w-2xl gap-2"
					onSubmit={(event) => {
						event.preventDefault()
						void createProject()
					}}
				>
					<Input
						data-id="new-project-name"
						value={name}
						maxLength={120}
						placeholder="New project name"
						aria-label="New project name"
						onChange={(event) => setName(event.target.value)}
					/>
					<Select value={client} onValueChange={(value) => setClient(value as Client)}>
						<SelectTrigger data-id="new-project-client" className="w-40" aria-label="Client">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={Client.MAXSHELF}>MaxShelf</SelectItem>
							<SelectItem value={Client.KITCHEN}>Kitchen</SelectItem>
						</SelectContent>
					</Select>
					<Button type="submit" disabled={!name.trim() || isCreating}>
						<Plus />
						{isCreating ? 'Creating…' : 'Create'}
					</Button>
				</form>

				{error && (
					<div
						data-id="project-dashboard-error"
						role="alert"
						className="mb-5 rounded-md border border-danger/50 bg-danger/10 p-4"
					>
						<p className="m-0 whitespace-pre-wrap break-words text-sm text-danger">{error}</p>
						<Button className="mt-3" size="sm" variant="outline" onClick={() => void loadProjects()}>
							Retry
						</Button>
					</div>
				)}

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading projects…</p>
				) : projects.length === 0 ? (
					<section className="rounded-xl border border-dashed border-border p-10 text-center">
						<h2 className="m-0 text-lg font-semibold">No projects yet</h2>
						<p className="mb-0 mt-2 text-sm text-muted-foreground">
							Name your first project above to start with the default assembly.
						</p>
					</section>
				) : (
					<ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
						{projects.map((project) => (
							<li
								key={project.id}
								data-id="project-card"
								className="rounded-lg border border-border bg-surface p-4 shadow-sm"
							>
								<h2 className="mb-1 mt-0 truncate text-base font-semibold">{project.name}</h2>
								<p
									data-id="project-owner"
									className="mb-1 mt-0 flex items-center gap-1.5 truncate text-xs text-muted-foreground"
									title={project.userEmail}
								>
									<UserRound className="size-3.5 shrink-0" aria-hidden="true" />
									<span className="truncate">{project.userEmail}</span>
								</p>
								<p className="mb-4 mt-0 text-xs text-muted-foreground">
									Updated {formatDate(project.updatedAt)}
								</p>
								<div className="flex gap-2">
									<Button className="flex-1" size="sm" onClick={() => onOpen(project.id)}>
										<FolderOpen />
										Open
									</Button>
									<Button
										size="icon"
										variant="outline"
										aria-label={`Delete ${project.name}`}
										onClick={() => setDeleteTarget(project)}
									>
										<Trash2 />
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<ConfirmationDialog
				open={deleteTarget !== null}
				title="Delete project?"
				message={
					deleteTarget
						? `"${deleteTarget.name}" will be permanently deleted. This cannot be undone.`
						: ''
				}
				onCancel={() => setDeleteTarget(null)}
				onConfirm={() => void deleteProject()}
			/>
		</main>
	)
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}

function errorMessage(cause: unknown, fallback: string): string {
	return `${fallback}\n${describeError(cause)}`
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause, null, 2) ?? String(cause)
	} catch {
		return String(cause)
	}
}
