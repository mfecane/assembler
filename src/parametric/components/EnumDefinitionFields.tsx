import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { EnumDefinitionDialog } from '@/parametric/components/EnumDefinitionDialog'
import { useEnumDefinition } from '@/parametric/hooks/useEnumDefinition'

export function EnumDefinitionFields({ inputId }: { inputId: string }) {
	const [dialogOpen, setDialogOpen] = useState(false)
	const binding = useEnumDefinition(inputId)
	if (!binding) return null
	const { definition, input } = binding

	return (
		<div data-id={`enum-definition-fields-${inputId}`} className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">Choice set</div>
			<div className="flex items-center gap-1">
				<Select value={definition.id} onValueChange={binding.setDefinition}>
					<SelectTrigger
						data-id={`graph-input-enum-definition-${inputId}`}
						className="nodrag h-8 min-w-0 flex-1 px-2 text-xs"
						aria-label="Shared choice set"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{binding.definitions.map((candidate) => (
							<SelectItem key={candidate.id} value={candidate.id}>
								{candidate.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					data-id={`graph-input-create-enum-${inputId}`}
					type="button"
					variant="outline"
					size="icon"
					className="nodrag h-8 w-8 shrink-0"
					onClick={binding.createDefinition}
					aria-label="Create and use a new choice set"
					title="Create and use a new choice set"
				>
					<Plus />
				</Button>
			</div>
			<div className="flex items-center justify-between gap-2">
				<div
					data-id={`enum-definition-usage-${definition.id}`}
					className="text-[10px] text-muted-foreground"
				>
					Shared by {binding.usageCount} graph {binding.usageCount === 1 ? 'input' : 'inputs'}.
				</div>
				<Button
					data-id={`enum-definition-edit-${definition.id}`}
					type="button"
					variant="outline"
					size="sm"
					className="nodrag h-7 shrink-0 px-2 text-xs"
					onClick={() => setDialogOpen(true)}
				>
					<Pencil />
					Edit choices
				</Button>
			</div>

			<Label className="text-[11px] text-muted-foreground">Default for this input</Label>
			<Select value={String(input.defaultValue ?? '')} onValueChange={binding.setDefault}>
				<SelectTrigger
					data-id={`graph-input-enum-default-${inputId}`}
					className="nodrag h-8 px-2 text-xs"
					aria-label="Default choice"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{definition.options.map((option) => (
						<SelectItem key={option} value={option}>{option}</SelectItem>
					))}
				</SelectContent>
			</Select>
			<EnumDefinitionDialog
				definition={definition}
				usageCount={binding.usageCount}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onRename={binding.renameDefinition}
				onAddOption={binding.addOption}
				onRenameOption={binding.renameOption}
				onRemoveOption={binding.removeOption}
			/>
		</div>
	)
}
