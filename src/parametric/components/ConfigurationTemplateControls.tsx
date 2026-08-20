import { useEffect, useState } from 'react'
import { Ellipsis, Pencil, Plus, Save, Trash2 } from 'lucide-react'
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
import { Button, buttonVariants } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ConfigurationTemplateNameDialog } from '@/parametric/components/ConfigurationTemplateNameDialog'
import type { ConfigurationTemplate } from '@/parametric/model/GraphDocumentModel'

const CUSTOM_CONFIGURATION_VALUE = 'custom-configuration'

export function ConfigurationTemplateControls({
	templates,
	createTemplate,
	removeTemplate,
	updateTemplate,
	renameTemplate,
	applyTemplate,
}: {
	templates: ConfigurationTemplate[]
	createTemplate: (label: string) => string
	removeTemplate: (templateId: string) => void
	updateTemplate: (templateId: string) => void
	renameTemplate: (templateId: string, label: string) => void
	applyTemplate: (templateId: string) => void
}) {
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>()
	const [nameDialogMode, setNameDialogMode] = useState<'create' | 'rename'>()
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [actionsOpen, setActionsOpen] = useState(false)
	const [status, setStatus] = useState('')
	const selectedTemplate = templates.find((template) => template.id === selectedTemplateId)

	useEffect(() => {
		if (!status) return
		const timeoutId = window.setTimeout(() => setStatus(''), 3000)
		return () => window.clearTimeout(timeoutId)
	}, [status])

	const create = (label: string) => {
		const templateId = createTemplate(label)
		setSelectedTemplateId(templateId)
		setStatus(`Created and selected “${label}”.`)
	}

	const rename = (label: string) => {
		if (!selectedTemplate) return
		renameTemplate(selectedTemplate.id, label)
		setStatus(`Renamed template to “${label}”.`)
	}

	return (
		<div data-id="configuration-template-controls" className="space-y-2">
			<div className="flex gap-2">
				<Select
					value={selectedTemplate?.id ?? CUSTOM_CONFIGURATION_VALUE}
					onValueChange={(templateId) => {
						setStatus('')
						if (templateId === CUSTOM_CONFIGURATION_VALUE) {
							setSelectedTemplateId(undefined)
							return
						}
						setSelectedTemplateId(templateId)
						applyTemplate(templateId)
					}}
				>
					<SelectTrigger
						data-id="configuration-template-selector"
						className="h-8 min-w-0 flex-1 px-2 text-xs"
						aria-label="Configuration template"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={CUSTOM_CONFIGURATION_VALUE}>Custom configuration</SelectItem>
						{templates.map((template) => (
							<SelectItem key={template.id} value={template.id}>
								{template.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Popover open={actionsOpen} onOpenChange={setActionsOpen}>
					<PopoverTrigger asChild>
						<Button
							data-id="configuration-template-actions"
							type="button"
							size="icon"
							variant="outline"
							className="size-8 shrink-0"
							aria-label="Template actions"
							title="Template actions"
						>
							<Ellipsis />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						data-id="configuration-template-actions-menu"
						align="end"
						className="w-44 p-1"
					>
						<Button
							data-id="create-configuration-template"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start"
							onClick={() => {
								setActionsOpen(false)
								setNameDialogMode('create')
							}}
						>
							<Plus />
							Save new
						</Button>
						<Button
							data-id="update-configuration-template"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start"
							disabled={!selectedTemplate}
							onClick={() => {
								if (!selectedTemplate) return
								updateTemplate(selectedTemplate.id)
								setStatus(`Updated “${selectedTemplate.label}” with the current values.`)
								setActionsOpen(false)
							}}
						>
							<Save />
							Update
						</Button>
						<Button
							data-id="rename-configuration-template"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start"
							disabled={!selectedTemplate}
							onClick={() => {
								setActionsOpen(false)
								setNameDialogMode('rename')
							}}
						>
							<Pencil />
							Rename
						</Button>
						<Button
							data-id="delete-configuration-template"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start text-muted-foreground hover:text-destructive"
							disabled={!selectedTemplate}
							onClick={() => {
								setActionsOpen(false)
								setDeleteDialogOpen(true)
							}}
						>
							<Trash2 />
							Delete
						</Button>
					</PopoverContent>
				</Popover>
			</div>
			<p data-id="configuration-template-status" className="min-h-4 text-xs text-muted-foreground">
				<span role="status" aria-live="polite">{status}</span>
			</p>

			<ConfigurationTemplateNameDialog
				mode={nameDialogMode ?? 'create'}
				open={nameDialogMode !== undefined}
				template={selectedTemplate}
				templates={templates}
				onOpenChange={(open) => {
					if (!open) setNameDialogMode(undefined)
				}}
				onSave={nameDialogMode === 'rename' ? rename : create}
			/>
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent data-id="delete-configuration-template-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{selectedTemplate?.label}”?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes the saved template. The current configuration values
							 will not change.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							data-id="confirm-delete-configuration-template"
							className={cn(buttonVariants({ variant: 'destructive' }))}
							onClick={() => {
								if (!selectedTemplate) return
								const deletedLabel = selectedTemplate.label
								removeTemplate(selectedTemplate.id)
								setSelectedTemplateId(undefined)
								setStatus(`Deleted “${deletedLabel}”. Current values were kept.`)
							}}
						>
							Delete template
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
