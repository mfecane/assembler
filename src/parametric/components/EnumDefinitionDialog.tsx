import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EnumDefinitionSnapshot } from '@/parametric/model/EnumDefinition'

export function EnumDefinitionDialog({
	definition,
	usageCount,
	open,
	onOpenChange,
	onRename,
	onAddOption,
	onRenameOption,
	onRemoveOption,
}: {
	definition: EnumDefinitionSnapshot
	usageCount: number
	open: boolean
	onOpenChange: (open: boolean) => void
	onRename: (name: string) => void
	onAddOption: () => void
	onRenameOption: (index: number, option: string) => void
	onRemoveOption: (index: number) => void
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-id={`enum-definition-dialog-${definition.id}`}
				className="sm:max-w-md"
			>
				<DialogHeader>
					<DialogTitle>Edit choice set</DialogTitle>
					<DialogDescription>
						Changes apply to {usageCount} graph {usageCount === 1 ? 'input' : 'inputs'} using
						 this shared choice set.
					</DialogDescription>
				</DialogHeader>

				<div data-id={`enum-definition-dialog-fields-${definition.id}`} className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`enum-definition-name-${definition.id}`}>Name</Label>
						<Input
							key={`${definition.id}:${definition.name}`}
							id={`enum-definition-name-${definition.id}`}
							data-id={`enum-definition-name-${definition.id}`}
							defaultValue={definition.name}
							onBlur={(event) => onRename(event.currentTarget.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') event.currentTarget.blur()
							}}
						/>
					</div>

					<div
						data-id={`enum-definition-options-${definition.id}`}
						className="space-y-2"
					>
						<div className="flex items-center justify-between">
							<Label>Values</Label>
							<Button
								data-id={`enum-definition-add-option-${definition.id}`}
								type="button"
								variant="outline"
								size="sm"
								onClick={onAddOption}
							>
								<Plus />
								Add choice
							</Button>
						</div>
						<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
							{definition.options.map((option, index) => (
								<div key={`${index}:${option}`} className="flex items-center gap-2">
									<Input
										data-id={`enum-definition-option-${definition.id}-${index}`}
										defaultValue={option}
										onBlur={(event) => onRenameOption(index, event.currentTarget.value)}
										onKeyDown={(event) => {
											if (event.key === 'Enter') event.currentTarget.blur()
										}}
										aria-label={`Choice ${index + 1}`}
									/>
									<Button
										data-id={`enum-definition-remove-option-${definition.id}-${index}`}
										type="button"
										variant="ghost"
										size="icon"
										className="shrink-0 text-muted-foreground hover:text-destructive"
										disabled={definition.options.length <= 1}
										onClick={() => onRemoveOption(index)}
										aria-label={`Remove choice ${index + 1}`}
									>
										<Trash2 />
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
