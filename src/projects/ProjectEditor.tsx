import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ParametricEditor } from '@/parametric/ParametricEditor'
import { LayoutEditor } from '@/layout/LayoutEditor'
import type { Editor } from '@/parametric/editor/Editor'
import { createEditor } from '@/parametric/editor/createEditor'
import type { ProjectRepository } from '@/projects/ProjectRepository'
import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import { getRegisteredModels } from '@/models/getRegisteredModels'
import { meshRepository } from '@/parametric/three/MeshRepository'
import { ProjectToolbar, type SaveState } from '@/projects/ProjectToolbar'
import type { Project } from '@/projects/projectTypes'
import type { GraphDocument } from '@/parametric/model/GraphSerialization'
import type { ProjectEditorMode } from '@/projects/ProjectEditorTabs'

interface LoadedEditor {
	project: Project
	editor: Editor
}

const AUTOSAVE_DELAY_MS = 800
const SAVED_CONFIRMATION_MS = 2_000

export function ProjectEditor({
	projectId,
	user,
	repository,
	modelMetadataRepository,
	onBack,
	onOpenProject,
	onSignOut,
}: {
	projectId: string
	user: User
	repository: ProjectRepository
	modelMetadataRepository: ModelMetadataRepository
	onBack: () => void
	onOpenProject: (projectId: string) => void
	onSignOut: () => void
}) {
	const [loaded, setLoaded] = useState<LoadedEditor | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [loadErrorDocument, setLoadErrorDocument] = useState<GraphDocument | null>(null)
	const [loadErrorProjectName, setLoadErrorProjectName] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [documentVersion, setDocumentVersion] = useState(0)
	const [savedDocumentVersion, setSavedDocumentVersion] = useState(0)
	const [isSaving, setIsSaving] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [isRenamingProject, setIsRenamingProject] = useState(false)
	const [projectRenameError, setProjectRenameError] = useState<string | null>(null)
	const [isSavingAs, setIsSavingAs] = useState(false)
	const [saveAsError, setSaveAsError] = useState<string | null>(null)
	const [showSavedConfirmation, setShowSavedConfirmation] = useState(false)
	const [editorMode, setEditorMode] = useState<ProjectEditorMode>('graph')
	const saveInFlight = useRef(false)
	const renameInFlight = useRef(false)
	const saveAsInFlight = useRef(false)

	const load = useCallback(async () => {
		setIsLoading(true)
		setLoadError(null)
		setLoadErrorDocument(null)
		setLoadErrorProjectName(null)
		let project: Project | null = null
		try {
			project = await repository.get(projectId)
			const modelIds = getRegisteredModels(project.graphDocument.client).map((model) => model.id)
			const metadataRecords = await modelMetadataRepository.listMetadata(modelIds)
			for (const record of metadataRecords) {
				meshRepository.setMetadata(record.modelId, record.metadata)
			}
			const editor = createEditor(project.graphDocument)
			const initialDocumentVersion = editor.controller.getSnapshot().documentVersion
			setLoaded({ project, editor })
			setDocumentVersion(initialDocumentVersion)
			setSavedDocumentVersion(initialDocumentVersion)
			setSaveError(null)
			setProjectRenameError(null)
			setSaveAsError(null)
			setShowSavedConfirmation(false)
		} catch (cause) {
			if (project) {
				setLoadErrorDocument(project.graphDocument)
				setLoadErrorProjectName(project.name)
			}
			setLoadError(
				cause instanceof Error
					? cause.message
					: 'The project could not be loaded or contains an invalid assembly document.'
			)
		} finally {
			setIsLoading(false)
		}
	}, [modelMetadataRepository, projectId, repository])

	useEffect(() => {
		void load()
	}, [load])

	useEffect(() => {
		if (!loaded) return
		let observedDocumentVersion = loaded.editor.controller.getSnapshot().documentVersion
		return loaded.editor.controller.subscribe(() => {
			const nextDocumentVersion = loaded.editor.controller.getSnapshot().documentVersion
			if (nextDocumentVersion === observedDocumentVersion) return
			observedDocumentVersion = nextDocumentVersion
			setDocumentVersion(nextDocumentVersion)
			setSaveError(null)
			setShowSavedConfirmation(false)
		})
	}, [loaded])

	const isDirty = documentVersion !== savedDocumentVersion

	useEffect(() => {
		if (!isDirty) return
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault()
			event.returnValue = ''
		}
		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	}, [isDirty])

	const saveState: SaveState = useMemo(() => {
		if (isSaving) return 'saving'
		if (saveError) return 'failed'
		if (isDirty) return 'dirty'
		return showSavedConfirmation ? 'saved' : 'clean'
	}, [isDirty, isSaving, saveError, showSavedConfirmation])

	const save = useCallback(async () => {
		if (!loaded || saveInFlight.current || renameInFlight.current) return
		const documentVersionBeingSaved = loaded.editor.controller.getSnapshot().documentVersion
		const document = loaded.editor.controller.exportGraph()
		saveInFlight.current = true
		setIsSaving(true)
		setSaveError(null)
		setShowSavedConfirmation(false)
		try {
			const project = await repository.save(loaded.project.id, document)
			setLoaded((current) =>
				current?.project.id === project.id ? { ...current, project } : current
			)
			setSavedDocumentVersion(documentVersionBeingSaved)
			setShowSavedConfirmation(true)
		} catch (cause) {
			const error = [
				`Failed to save project "${loaded.project.name}"`,
				`(project ID: ${loaded.project.id}, document version: ${documentVersionBeingSaved}).`,
				describeError(cause),
			].join(' ')
			console.error(error, {
				cause,
				projectId: loaded.project.id,
				projectName: loaded.project.name,
				documentVersion: documentVersionBeingSaved,
			})
			setSaveError(error)
		} finally {
			saveInFlight.current = false
			setIsSaving(false)
		}
	}, [loaded, repository])

	useEffect(() => {
		if (!isDirty || isSaving || isRenamingProject || saveError) return
		const timeout = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
		return () => window.clearTimeout(timeout)
	}, [documentVersion, isDirty, isRenamingProject, isSaving, save, saveError])

	const renameProject = useCallback(async (name: string) => {
		if (!loaded || saveInFlight.current || renameInFlight.current) return
		const previousName = loaded.project.name
		renameInFlight.current = true
		setIsRenamingProject(true)
		setProjectRenameError(null)
		try {
			const project = await repository.rename(loaded.project.id, name)
			setLoaded((current) =>
				current?.project.id === project.id ? { ...current, project } : current
			)
		} catch (cause) {
			const error = [
				`Failed to rename project "${previousName}" to "${name}"`,
				`(project ID: ${loaded.project.id}, user ID: ${user.id}).`,
				describeError(cause),
			].join(' ')
			console.error(error, {
				cause,
				projectId: loaded.project.id,
				previousProjectName: previousName,
				requestedProjectName: name,
				userId: user.id,
			})
			setProjectRenameError(error)
		} finally {
			renameInFlight.current = false
			setIsRenamingProject(false)
		}
	}, [loaded, repository, user.id])

	const saveAs = useCallback(async (name: string) => {
		if (!loaded || saveAsInFlight.current) return
		const documentVersionBeingCopied = loaded.editor.controller.getSnapshot().documentVersion
		const document = loaded.editor.controller.exportGraph()
		saveAsInFlight.current = true
		setIsSavingAs(true)
		setSaveAsError(null)
		try {
			const project = await repository.create(name, document)
			onOpenProject(project.id)
		} catch (cause) {
			const error = [
				`Failed to save project "${loaded.project.name}" as "${name}"`,
				`(source project ID: ${loaded.project.id}, user ID: ${user.id}, document version: ${documentVersionBeingCopied}).`,
				describeError(cause),
			].join(' ')
			console.error(error, {
				cause,
				sourceProjectId: loaded.project.id,
				sourceProjectName: loaded.project.name,
				requestedProjectName: name,
				userId: user.id,
				documentVersion: documentVersionBeingCopied,
			})
			setSaveAsError(error)
		} finally {
			saveAsInFlight.current = false
			setIsSavingAs(false)
		}
	}, [loaded, onOpenProject, repository, user.id])

	useEffect(() => {
		const handleSaveShortcut = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
			event.preventDefault()
			if (!isSaving && !isRenamingProject && !isSavingAs) void save()
		}
		window.addEventListener('keydown', handleSaveShortcut)
		return () => window.removeEventListener('keydown', handleSaveShortcut)
	}, [isRenamingProject, isSaving, isSavingAs, save])

	useEffect(() => {
		if (!showSavedConfirmation) return
		const timeout = window.setTimeout(
			() => setShowSavedConfirmation(false),
			SAVED_CONFIRMATION_MS
		)
		return () => window.clearTimeout(timeout)
	}, [showSavedConfirmation])

	const confirmDiscard = (action: () => void) => {
		if (saveInFlight.current) return
		if (
			isDirty &&
			!window.confirm('You have unsaved changes. Leave this project and discard them?')
		) {
			return
		}
		action()
	}

	if (isLoading) {
		return <FullPageMessage title="Loading project…" />
	}

	if (loadError || !loaded) {
		return (
			<FullPageMessage
				dataId="project-load-error"
				title="Project could not be opened"
				message={loadError ?? 'The project was not found.'}
				actions={
					<>
						{loadErrorDocument && (
							<Button
								data-id="download-project-json-button"
								onClick={() => downloadJsonDocument(
									loadErrorDocument,
									`${safeFileName(loadErrorProjectName ?? projectId)}.json`,
								)}
							>
								<Download />
								Download JSON
							</Button>
						)}
						<Button onClick={() => void load()}>Retry</Button>
						<Button variant="outline" onClick={onBack}>Back to projects</Button>
					</>
				}
			/>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ProjectToolbar
				name={loaded.project.name}
				user={user}
				editorMode={editorMode}
				controller={loaded.editor.controller}
				saveState={saveState}
				saveError={saveError}
				projectRenamePending={isRenamingProject}
				projectRenameError={projectRenameError}
				saveAsPending={isSavingAs}
				saveAsError={saveAsError}
				navigationDisabled={isSaving || isRenamingProject || isSavingAs}
				onBack={() => confirmDiscard(onBack)}
				onEditorModeChange={setEditorMode}
				onSave={() => void save()}
				onPrepareSaveAs={() => setSaveAsError(null)}
				onSaveAs={(name) => void saveAs(name)}
				onRename={(name) => void renameProject(name)}
				onSignOut={() => confirmDiscard(onSignOut)}
			/>
			{editorMode === 'graph' ? (
				<ParametricEditor
					key={loaded.project.id}
					editor={loaded.editor}
					className="h-auto w-full min-h-0 flex-1"
				/>
			) : (
				<LayoutEditor
					key={loaded.project.id}
					editor={loaded.editor}
					className="h-auto w-full min-h-0 flex-1"
				/>
			)}
		</div>
	)
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause)
	} catch {
		return String(cause)
	}
}

function FullPageMessage({
	dataId,
	title,
	message,
	actions,
}: {
	dataId?: string
	title: string
	message?: string
	actions?: React.ReactNode
}) {
	return (
		<main data-id={dataId} className="flex min-h-full items-center justify-center p-6 text-center">
			<div>
				<h1 className="m-0 text-xl font-semibold">{title}</h1>
				{message && <p className="mt-2 max-w-lg text-sm text-muted-foreground">{message}</p>}
				{actions && <div className="mt-5 flex justify-center gap-2">{actions}</div>}
			</div>
		</main>
	)
}

function downloadJsonDocument(graphDocument: GraphDocument, fileName: string): void {
	const blob = new Blob([JSON.stringify(graphDocument, null, 2)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = fileName
	link.click()
	URL.revokeObjectURL(url)
}

function safeFileName(value: string): string {
	return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'project'
}
