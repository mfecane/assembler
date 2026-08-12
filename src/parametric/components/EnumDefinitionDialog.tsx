import { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
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
import { useSortableEnumOption } from '@/parametric/hooks/useSortableEnumOption'

export function EnumDefinitionDialog({
	definition,
	usageCount,
	open,
	onOpenChange,
	onRename,
	onAddOption,
	onRenameOption,
	onRemoveOption,
	onMoveOption,
}: {
	definition: EnumDefinitionSnapshot
	usageCount: number
	open: boolean
	onOpenChange: (open: boolean) => void
	onRename: (name: string) => void
	onAddOption: () => void
	onRenameOption: (index: number, option: string) => void
	onRemoveOption: (index: number) => void
	onMoveOption: (sourceIndex: number, targetIndex: number) => void
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
						<div className="flex items-center justify-between gap-3">
							<div>
								<Label>Values</Label>
								<p className="text-[11px] text-muted-foreground">
									Drag to reorder. Double-click a value to rename it.
								</p>
							</div>
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
						<DndProvider backend={HTML5Backend}>
							<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
								{definition.options.map((option, index) => (
									<EnumOptionRow
										key={option}
										definitionId={definition.id}
										index={index}
										option={option}
										canRemove={definition.options.length > 1}
										onMove={onMoveOption}
										onRename={onRenameOption}
										onRemove={onRemoveOption}
									/>
								))}
							</div>
						</DndProvider>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function EnumOptionRow({
	definitionId,
	index,
	option,
	canRemove,
	onMove,
	onRename,
	onRemove,
}: {
	definitionId: string
	index: number
	option: string
	canRemove: boolean
	onMove: (sourceIndex: number, targetIndex: number) => void
	onRename: (index: number, option: string) => void
	onRemove: (index: number) => void
}) {
	const [editing, setEditing] = useState(false)
	const { containerRef, handleRef, isDragging } = useSortableEnumOption(index, onMove)
	return (
		<div
			ref={containerRef}
			data-id={`enum-definition-option-row-${definitionId}-${index}`}
			className="flex items-center gap-2"
			style={{ opacity: isDragging ? 0.5 : 1 }}
		>
			<Button
				ref={handleRef}
				data-id={`enum-definition-move-option-${definitionId}-${index}`}
				type="button"
				variant="ghost"
				size="icon"
				className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
				aria-label={`Move choice ${index + 1}`}
			>
				<GripVertical />
			</Button>
			{editing ? (
				<Input
					data-id={`enum-definition-option-${definitionId}-${index}`}
					defaultValue={option}
					autoFocus
					onBlur={(event) => {
						onRename(index, event.currentTarget.value)
						setEditing(false)
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter') event.currentTarget.blur()
						if (event.key === 'Escape') setEditing(false)
					}}
					aria-label={`Choice ${index + 1}`}
				/>
			) : (
				<button
					data-id={`enum-definition-option-label-${definitionId}-${index}`}
					type="button"
					className="h-9 min-w-0 flex-1 truncate rounded-md border border-input px-3 text-left text-sm"
					onDoubleClick={() => setEditing(true)}
					title={`${option} · Double-click to rename`}
				>
					{option}
				</button>
			)}
			<Button
				data-id={`enum-definition-remove-option-${definitionId}-${index}`}
				type="button"
				variant="ghost"
				size="icon"
				className="shrink-0 text-muted-foreground hover:text-destructive"
				disabled={!canRemove}
				onClick={() => onRemove(index)}
				aria-label={`Remove choice ${index + 1}`}
			>
				<Trash2 />
			</Button>
		</div>
	)
}
