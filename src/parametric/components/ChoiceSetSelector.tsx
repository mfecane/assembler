import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { EnumDefinitionDialog } from '@/parametric/components/EnumDefinitionDialog'
import type { EnumDefinitionSnapshot } from '@/parametric/model/EnumDefinition'

interface ChoiceSetSelectorProps {
	dataId: string
	definition: EnumDefinitionSnapshot
	definitions: readonly EnumDefinitionSnapshot[]
	usageCount: number
	onDefinitionChange: (enumId: string) => void
	onRename: (name: string) => void
	onAddOption: () => void
	onRenameOption: (index: number, option: string) => void
	onRemoveOption: (index: number) => void
	onMoveOption: (sourceIndex: number, targetIndex: number) => void
	onCreateDefinition: () => void
	onDeleteDefinition: () => void
	canDeleteDefinition: boolean
}

export function ChoiceSetSelector({
	dataId,
	definition,
	definitions,
	usageCount,
	onDefinitionChange,
	onRename,
	onAddOption,
	onRenameOption,
	onRemoveOption,
	onMoveOption,
	onCreateDefinition,
	onDeleteDefinition,
	canDeleteDefinition,
}: ChoiceSetSelectorProps) {
	const [dialogOpen, setDialogOpen] = useState(false)
	return (
		<div data-id={dataId} className="flex items-center gap-1">
			<Select value={definition.id} onValueChange={onDefinitionChange}>
				<SelectTrigger
					data-id={`${dataId}-select`}
					className="nodrag h-8 min-w-0 flex-1 px-2 text-xs"
					aria-label="Choice set"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{definitions.map((candidate) => (
						<SelectItem key={candidate.id} value={candidate.id}>
							{candidate.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				data-id={`${dataId}-edit`}
				type="button"
				variant="outline"
				size="icon"
				className="nodrag h-8 w-8 shrink-0"
				onClick={() => setDialogOpen(true)}
				aria-label="Edit choices"
				title="Edit choices"
			>
				<Pencil />
			</Button>
			<EnumDefinitionDialog
				definition={definition}
				definitions={definitions}
				usageCount={usageCount}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onRename={onRename}
				onAddOption={onAddOption}
				onRenameOption={onRenameOption}
				onRemoveOption={onRemoveOption}
				onMoveOption={onMoveOption}
				onDefinitionChange={onDefinitionChange}
				onCreateDefinition={onCreateDefinition}
				onDeleteDefinition={onDeleteDefinition}
				canDeleteDefinition={canDeleteDefinition}
			/>
		</div>
	)
}
