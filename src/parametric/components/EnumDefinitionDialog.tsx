import { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Ellipsis, GripVertical, Plus, Trash2 } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EnumDefinitionSnapshot } from '@/parametric/model/EnumDefinition'
import { useSortableEnumOption } from '@/parametric/hooks/useSortableEnumOption'

export function EnumDefinitionDialog({
	definition,
	definitions,
	usageCount,
	open,
	onOpenChange,
	onRename,
	onAddOption,
	onRenameOption,
	onRemoveOption,
	onMoveOption,
	onDefinitionChange,
	onCreateDefinition,
	onDeleteDefinition,
	canDeleteDefinition,
}: {
	definition: EnumDefinitionSnapshot
	definitions: readonly EnumDefinitionSnapshot[]
	usageCount: number
	open: boolean
	onOpenChange: (open: boolean) => void
	onRename: (name: string) => void
	onAddOption: () => void
	onRenameOption: (index: number, option: string) => void
	onRemoveOption: (index: number) => void
	onMoveOption: (sourceIndex: number, targetIndex: number) => void
	onDefinitionChange: (enumId: string) => void
	onCreateDefinition: () => void
	onDeleteDefinition: () => void
	canDeleteDefinition: boolean
}) {
	const [actionsOpen, setActionsOpen] = useState(false)
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-id={`enum-definition-dialog-${definition.id}`}
				className="sm:max-w-md"
			>
				<DialogHeader>
					<div className="flex items-center gap-1">
						<Select value={definition.id} onValueChange={onDefinitionChange}>
							<SelectTrigger data-id={`enum-definition-select-${definition.id}`} className="h-8 min-w-0 flex-1 text-xs" aria-label="Choice set">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>{definitions.map((candidate) => (
								<SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>
							))}</SelectContent>
						</Select>
						<Popover open={actionsOpen} onOpenChange={setActionsOpen}>
							<PopoverTrigger asChild>
								<Button data-id={`enum-definition-actions-${definition.id}`} type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Choice set actions"><Ellipsis /></Button>
							</PopoverTrigger>
							<PopoverContent data-id={`enum-definition-actions-menu-${definition.id}`} align="end" className="w-36 p-1">
								<Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setActionsOpen(false); onCreateDefinition() }}><Plus />Add choice set</Button>
								<Button type="button" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive" disabled={!canDeleteDefinition} onClick={() => { setActionsOpen(false); onDeleteDefinition() }}><Trash2 />Delete choice set</Button>
							</PopoverContent>
						</Popover>
					</div>
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
