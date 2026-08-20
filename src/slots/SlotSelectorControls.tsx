import { useEffect, useState } from 'react'
import { Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { LayoutSlotDocument } from '@/layout/LayoutDocument'

export function SlotSelectorControls({
	slots,
	selectedSlotId,
	onSelect,
	onCreate,
	onRename,
	onDelete,
	deleteDisabled,
}: {
	slots: LayoutSlotDocument[]
	selectedSlotId: string
	onSelect: (slotId: string) => void
	onCreate: (label: string) => string
	onRename: (label: string) => void
	onDelete: () => void
	deleteDisabled: boolean
}) {
	const [action, setAction] = useState<'create' | 'rename'>()
	const [actionsOpen, setActionsOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [name, setName] = useState('')
	const selectedSlot = slots.find((slot) => slot.id === selectedSlotId)
	if (!selectedSlot) {
		throw new Error(
			`Slot selector cannot find selected slot "${selectedSlotId}". Available slots: `
			+ `${JSON.stringify(slots.map((slot) => slot.id))}.`
		)
	}

	useEffect(() => setName(action === 'rename' ? selectedSlot.label : ''), [action, selectedSlot.label])

	return (
		<div data-id="slot-selector-controls" className="space-y-2">
			<div className="flex gap-2">
				<Select value={selectedSlotId} onValueChange={onSelect}>
					<SelectTrigger
						data-id="active-slot-select"
						className="h-8 min-w-0 flex-1 px-2 text-xs"
						aria-label="Slot"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{slots.map((slot) => (
							<SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Popover open={actionsOpen} onOpenChange={setActionsOpen}>
					<PopoverTrigger asChild>
						<Button
							data-id="slot-actions"
							type="button"
							size="icon"
							variant="outline"
							className="size-8 shrink-0"
							aria-label="Slot actions"
							title="Slot actions"
						>
							<Ellipsis />
						</Button>
					</PopoverTrigger>
					<PopoverContent data-id="slot-actions-menu" align="end" className="w-40 p-1">
						<Button
							data-id="create-slot"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start"
							onClick={() => { setActionsOpen(false); setAction('create') }}
						>
							<Plus />
							Add slot
						</Button>
						<Button
							data-id="rename-slot"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start"
							onClick={() => { setActionsOpen(false); setAction('rename') }}
						>
							<Pencil />
							Rename
						</Button>
						<Button
							data-id="delete-slot"
							type="button"
							size="sm"
							variant="ghost"
							className="w-full justify-start text-muted-foreground hover:text-destructive"
							disabled={deleteDisabled}
							onClick={() => { setActionsOpen(false); setDeleteOpen(true) }}
						>
							<Trash2 />
							Delete
						</Button>
					</PopoverContent>
				</Popover>
			</div>
			<Dialog
				open={action !== undefined}
				onOpenChange={(open) => { if (!open) setAction(undefined) }}
			>
				<DialogContent data-id="slot-name-dialog">
					<form
						onSubmit={(event) => {
							event.preventDefault()
							const label = name.trim()
							if (!label) return
							if (action === 'create') onSelect(onCreate(label))
							else onRename(label)
							setAction(undefined)
						}}
					>
						<DialogHeader>
							<DialogTitle>{action === 'create' ? 'Add slot' : 'Rename slot'}</DialogTitle>
						</DialogHeader>
						<div className="py-4">
							<Label htmlFor="slot-name-input">Name</Label>
							<Input
								id="slot-name-input"
								data-id="slot-name-input"
								className="mt-2"
								value={name}
								onChange={(event) => setName(event.target.value)}
								autoFocus
							/>
						</div>
						<DialogFooter>
							<Button type="submit">{action === 'create' ? 'Add' : 'Rename'}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent data-id="delete-slot-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{selectedSlot.label}”?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the unassigned slot definition and its product eligibility rules.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className={cn(buttonVariants({ variant: 'destructive' }))}
							onClick={onDelete}
						>
							Delete slot
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
