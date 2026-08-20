import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import type { ConfigurationTemplate } from '@/parametric/model/GraphDocumentModel'

export function ConfigurationTemplateNameDialog({
	mode,
	open,
	template,
	templates,
	onOpenChange,
	onSave,
}: {
	mode: 'create' | 'rename'
	open: boolean
	template?: ConfigurationTemplate
	templates: ConfigurationTemplate[]
	onOpenChange: (open: boolean) => void
	onSave: (name: string) => void
}) {
	const [nameDraft, setNameDraft] = useState('')

	useEffect(() => {
		if (!open) return
		setNameDraft(mode === 'rename' ? template?.label ?? '' : '')
	}, [mode, open, template])

	const normalizedName = nameDraft.trim()
	const duplicate = templates.find((candidate) => (
		candidate.id !== template?.id
		&& candidate.label.localeCompare(normalizedName, undefined, { sensitivity: 'accent' }) === 0
	))
	const error = duplicate
		? `A template named “${duplicate.label}” already exists.`
		: undefined

	const save = () => {
		if (!normalizedName || error) return
		onSave(normalizedName)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-id="configuration-template-name-dialog" className="sm:max-w-md">
				<form
					data-id="configuration-template-name-form"
					onSubmit={(event) => {
						event.preventDefault()
						save()
					}}
				>
					<DialogHeader>
						<DialogTitle>
							{mode === 'create' ? 'Save configuration template' : 'Rename template'}
						</DialogTitle>
						<DialogDescription>
							{mode === 'create'
								? 'Save the current configuration values under a recognizable name.'
								: `Choose a new name for “${template?.label}”.`}
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 grid gap-2">
						<Label htmlFor="configuration-template-name">Name</Label>
						<Input
							id="configuration-template-name"
							data-id="configuration-template-name-input"
							value={nameDraft}
							onChange={(event) => setNameDraft(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							aria-invalid={Boolean(error)}
							aria-describedby="configuration-template-name-error"
							autoFocus
						/>
						<p
							id="configuration-template-name-error"
							className="min-h-4 text-xs text-destructive"
						>
							{error}
						</p>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							data-id="save-configuration-template-name"
							type="submit"
							disabled={!normalizedName || Boolean(error)}
						>
							{mode === 'create' ? 'Save template' : 'Rename'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
