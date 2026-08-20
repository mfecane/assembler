import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Client } from '@/cosntants'
import type { ModelCatalogItem } from '@/models/ModelCatalogItem'
import { createModelMetadataDocument } from '@/models/ModelMetadataDocument'
import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import {
	useModelEditorInstance,
	useModelProjectSnapshot,
	useModelReactBridgeSnapshot,
} from '@/models/editor/react/ModelEditorContext'
import { Check, Download, Loader2, Redo2, Save, Undo2 } from 'lucide-react'

export function ModelEditorHeaderActions({
	client,
	models,
	metadataRepository,
}: {
	client: Client
	models: readonly ModelCatalogItem[]
	metadataRepository: ModelMetadataRepository
}) {
	const editor = useModelEditorInstance()
	const controller = editor.controller
	const { isSaving, saved, canUndo, canRedo, error } = useModelReactBridgeSnapshot()
	const { metadataPendingSave } = useModelProjectSnapshot()
	const saveDisabled = isSaving || error !== null || !metadataPendingSave
	const exportMetadata = async () => {
		try {
			const metadataRecords = await metadataRepository.listMetadata(models.map((model) => model.id))
			const document = createModelMetadataDocument(client, models, metadataRecords)
			const url = URL.createObjectURL(
				new Blob([JSON.stringify(document, null, 2)], {
					type: 'application/json',
				})
			)
			const link = window.document.createElement('a')
			link.href = url
			link.download = 'metadata.json'
			link.click()
			URL.revokeObjectURL(url)
		} catch (cause) {
			const reason =
				cause instanceof Error
					? `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
					: String(cause)
			const message = `Could not export metadata for client "${client}". ${reason}`
			console.error(message, { cause, client, modelIds: models.map((model) => model.id) })
			window.alert(message)
		}
	}

	return (
		<div data-id="model-editor-header-actions" className="flex shrink-0 items-center gap-2">
			<TooltipProvider delayDuration={200}>
				<ButtonGroup data-id="model-history-actions">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								data-id="undo-model-metadata"
								type="button"
								size="icon"
								variant="outline"
								disabled={isSaving || !canUndo}
								aria-label="Undo model metadata change"
								onClick={() => controller.undo()}
							>
								<Undo2 />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Undo metadata change</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								data-id="redo-model-metadata"
								type="button"
								size="icon"
								variant="outline"
								disabled={isSaving || !canRedo}
								aria-label="Redo model metadata change"
								onClick={() => controller.redo()}
							>
								<Redo2 />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Redo metadata change</TooltipContent>
					</Tooltip>
				</ButtonGroup>
			</TooltipProvider>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							data-id="export-model-metadata"
							type="button"
							size="icon"
							variant="outline"
							disabled={isSaving}
							aria-label={`Export all ${client} model metadata`}
							onClick={() => void exportMetadata()}
						>
							<Download />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Export all saved model metadata</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<Button
				data-id="save-model-metadata"
				type="button"
				size="sm"
				disabled={saveDisabled}
				onClick={() => void controller.save()}
			>
				{isSaving ? <Loader2 className="animate-spin" /> : saved && !metadataPendingSave ? <Check /> : <Save />}
				{isSaving ? 'Saving…' : 'Save'}
			</Button>
		</div>
	)
}
