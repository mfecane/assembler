import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ModelEditingWorkspace } from '@/models/ModelEditingWorkspace'
import { ModelEditorHeader } from '@/models/ModelEditorHeader'
import { ModelEditorHeaderActions } from '@/models/ModelEditorHeaderActions'
import type { ModelCatalogItem } from '@/models/ModelCatalogItem'
import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import { getRegisteredModels } from '@/models/getRegisteredModels'
import {
	ModelEditorProvider,
	useModelEditorInstance,
	useModelProjectSnapshot,
	useModelReactBridgeSnapshot,
} from '@/models/editor/react/ModelEditorContext'
import { useModelEditor } from '@/models/editor/react/useModelEditor'
import { useSelectedClient } from '@/projects/useSelectedClient'

interface ModelEditorProps {
	modelId: string | undefined
	user: User
	metadataRepository: ModelMetadataRepository
	onBack: () => void
	onSelectModel: (modelId: string, replace?: boolean) => void
	onSignOut: () => void
}

export function ModelEditor(props: ModelEditorProps) {
	const { modelId, onSelectModel } = props
	const [client] = useSelectedClient()
	const models = useMemo(() => getRegisteredModels(client), [client])
	const selectedModel = models.find((model) => model.id === modelId)

	useEffect(() => {
		if (models.length > 0 && !modelId) {
			onSelectModel(models[0].id, true)
		}
	}, [modelId, models, onSelectModel])

	return (
		<main data-id="model-editor" className="flex h-full min-h-0 flex-col">
			{selectedModel ? (
				<SelectedModelEditor
					key={selectedModel.id}
					{...props}
					client={client}
					models={models}
					selectedModel={selectedModel}
				/>
			) : (
				<>
					<ModelEditorHeader
						client={client}
						models={models}
						selectedModel={selectedModel}
						modelsLoading={false}
						user={props.user}
						onBack={props.onBack}
						onSelectModel={props.onSelectModel}
						onSignOut={props.onSignOut}
					/>
					{models.length === 0 ? (
						<EditorMessage
							title="No registered models"
							message={`Client "${client}" has no selectable models registered at runtime.`}
						/>
					) : modelId ? (
						<EditorMessage
							title="Model could not be opened"
							message={
								`Model "${modelId}" is not registered for the current client "${client}". `
								+ 'Choose an available model above or return to Projects and change the client.'
							}
						/>
					) : null}
				</>
			)}
		</main>
	)
}

function SelectedModelEditor({
	selectedModel,
	client,
	models,
	user,
	metadataRepository,
	onBack,
	onSelectModel,
	onSignOut,
}: Omit<ModelEditorProps, 'modelId'> & {
	selectedModel: ModelCatalogItem
	client: ReturnType<typeof useSelectedClient>[0]
	models: readonly ModelCatalogItem[]
}) {
	const { editor, isLoading, error, reload } = useModelEditor(metadataRepository, selectedModel.id)
	const header = (actions?: ReactNode) => (
		<ModelEditorHeader
			client={client}
			models={models}
			selectedModel={selectedModel}
			modelsLoading={false}
			actions={actions}
			user={user}
			onBack={onBack}
			onSelectModel={onSelectModel}
			onSignOut={onSignOut}
		/>
	)

	if (isLoading) {
		return (
			<>
				{header()}
				<EditorMessage title={`Loading editor for model "${selectedModel.id}"…`} />
			</>
		)
	}
	if (error) {
		return (
			<>
				{header()}
				<EditorMessage
					title={`Model "${selectedModel.id}" could not be opened`}
					message={error}
					onRetry={reload}
				/>
			</>
		)
	}
	if (!editor) {
		throw new Error(
			`Model editor lifecycle for "${selectedModel.id}" finished loading without an editor or an error.`
		)
	}

	return (
		<ModelEditorProvider editor={editor}>
			<LoadedModelEditor
				client={client}
				models={models}
				selectedModel={selectedModel}
				metadataRepository={metadataRepository}
				user={user}
				onBack={onBack}
				onSelectModel={onSelectModel}
				onSignOut={onSignOut}
			/>
		</ModelEditorProvider>
	)
}

type PendingNavigation =
	| { kind: 'back' }
	| { kind: 'model'; modelId: string }
	| { kind: 'sign-out' }

function LoadedModelEditor({
	client,
	models,
	selectedModel,
	metadataRepository,
	user,
	onBack,
	onSelectModel,
	onSignOut,
}: {
	client: ReturnType<typeof useSelectedClient>[0]
	models: readonly ModelCatalogItem[]
	selectedModel: ModelCatalogItem
	metadataRepository: ModelMetadataRepository
	user: User
	onBack: () => void
	onSelectModel: (modelId: string) => void
	onSignOut: () => void
}) {
	const editor = useModelEditorInstance()
	const { metadataPendingSave } = useModelProjectSnapshot()
	const { isSaving, error } = useModelReactBridgeSnapshot()
	const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)

	useEffect(() => {
		if (!metadataPendingSave) return
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault()
			event.returnValue = ''
		}
		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	}, [metadataPendingSave])

	useEffect(() => {
		const handleSaveShortcut = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
			event.preventDefault()
			if (metadataPendingSave && !isSaving && !error) void editor.controller.save()
		}
		window.addEventListener('keydown', handleSaveShortcut)
		return () => window.removeEventListener('keydown', handleSaveShortcut)
	}, [editor, error, isSaving, metadataPendingSave])

	const requestNavigation = useCallback((navigation: PendingNavigation) => {
		if (isSaving) return
		if (metadataPendingSave) {
			setPendingNavigation(navigation)
			return
		}
		executeNavigation(navigation, onBack, onSelectModel, onSignOut)
	}, [isSaving, metadataPendingSave, onBack, onSelectModel, onSignOut])

	const discardAndNavigate = () => {
		if (!pendingNavigation) return
		const navigation = pendingNavigation
		setPendingNavigation(null)
		executeNavigation(navigation, onBack, onSelectModel, onSignOut)
	}

	const saveAndNavigate = async (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()
		if (!pendingNavigation || isSaving) return
		await editor.controller.save()
		if (editor.controller.project.getSnapshot().metadataPendingSave) return
		const navigation = pendingNavigation
		setPendingNavigation(null)
		executeNavigation(navigation, onBack, onSelectModel, onSignOut)
	}

	return (
		<>
			<ModelEditorHeader
				client={client}
				models={models}
				selectedModel={selectedModel}
				modelsLoading={false}
				navigationDisabled={isSaving}
				actions={<ModelEditorHeaderActions client={client} models={models} metadataRepository={metadataRepository} />}
				user={user}
				onBack={() => requestNavigation({ kind: 'back' })}
				onSelectModel={(modelId) => requestNavigation({ kind: 'model', modelId })}
				onSignOut={() => requestNavigation({ kind: 'sign-out' })}
			/>
			<ModelEditingWorkspace />
			<AlertDialog
				open={pendingNavigation !== null}
				onOpenChange={(open) => {
					if (!open) setPendingNavigation(null)
				}}
			>
				<AlertDialogContent data-id="discard-model-changes-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved model changes?</AlertDialogTitle>
						<AlertDialogDescription>
							Model “{selectedModel.name}” has metadata changes that have not been saved.
							Leaving now will discard them.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							data-id="save-before-leave-model-changes"
							disabled={isSaving}
							onClick={(event) => void saveAndNavigate(event)}
						>
							{isSaving ? 'Saving…' : 'Save changes'}
						</AlertDialogAction>
						<AlertDialogAction
							data-id="confirm-discard-model-changes"
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={discardAndNavigate}
						>
							Discard changes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

function executeNavigation(
	navigation: PendingNavigation,
	onBack: () => void,
	onSelectModel: (modelId: string) => void,
	onSignOut: () => void
): void {
	if (navigation.kind === 'back') {
		onBack()
	} else if (navigation.kind === 'model') {
		onSelectModel(navigation.modelId)
	} else {
		onSignOut()
	}
}

function EditorMessage({
	title,
	message,
	onRetry,
}: {
	title: string
	message?: string
	onRetry?: () => void
}) {
	return (
		<section data-id="model-editor-message" className="flex flex-1 items-center justify-center p-6 text-center">
			<div>
				<h2 className="m-0 text-lg font-semibold">{title}</h2>
				{message && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>}
				{onRetry && <Button className="mt-4" variant="outline" onClick={onRetry}>Retry</Button>}
			</div>
		</section>
	)
}
