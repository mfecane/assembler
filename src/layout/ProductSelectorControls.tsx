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
import type { ProductDocument } from '@/layout/LayoutDocument'

export function ProductSelectorControls({
	products,
	activeProductId,
	onSelect,
	onCreate,
	onRename,
	onDelete,
}: {
	products: ProductDocument[]
	activeProductId: string
	onSelect: (productId: string) => void
	onCreate: (label: string) => void
	onRename: (label: string) => void
	onDelete: () => void
}) {
	const [action, setAction] = useState<'create' | 'rename'>()
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [actionsOpen, setActionsOpen] = useState(false)
	const [name, setName] = useState('')
	const activeProduct = products.find((product) => product.id === activeProductId)

	useEffect(() => setName(action === 'rename' ? activeProduct?.label ?? '' : ''), [action, activeProduct?.label])

	return (
		<div data-id="product-selector-controls" className="space-y-2">
			<div className="flex gap-2">
				<Select value={activeProductId} onValueChange={onSelect}>
					<SelectTrigger data-id="active-product-select" className="h-8 min-w-0 flex-1 px-2 text-xs" aria-label="Product">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.label}</SelectItem>)}
					</SelectContent>
				</Select>
				<Popover open={actionsOpen} onOpenChange={setActionsOpen}>
					<PopoverTrigger asChild>
						<Button data-id="product-actions" type="button" size="icon" variant="outline" className="size-8 shrink-0" aria-label="Product actions" title="Product actions">
							<Ellipsis />
						</Button>
					</PopoverTrigger>
					<PopoverContent data-id="product-actions-menu" align="end" className="w-40 p-1">
						<Button data-id="create-product" type="button" size="sm" variant="ghost" className="w-full justify-start" onClick={() => { setActionsOpen(false); setAction('create') }}><Plus />Add product</Button>
						<Button data-id="rename-product" type="button" size="sm" variant="ghost" className="w-full justify-start" onClick={() => { setActionsOpen(false); setAction('rename') }}><Pencil />Rename</Button>
						<Button data-id="delete-product" type="button" size="sm" variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" disabled={products.length <= 1} onClick={() => { setActionsOpen(false); setDeleteOpen(true) }}><Trash2 />Delete</Button>
					</PopoverContent>
				</Popover>
			</div>
			<Dialog open={action !== undefined} onOpenChange={(open) => { if (!open) setAction(undefined) }}>
				<DialogContent data-id="product-name-dialog">
					<form onSubmit={(event) => { event.preventDefault(); const label = name.trim(); if (!label) return; if (action === 'create') onCreate(label); else onRename(label); setAction(undefined) }}>
						<DialogHeader><DialogTitle>{action === 'create' ? 'Add product' : 'Rename product'}</DialogTitle></DialogHeader>
						<div className="py-4"><Label htmlFor="product-name-input">Name</Label><Input id="product-name-input" data-id="product-name-input" className="mt-2" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></div>
						<DialogFooter><Button type="submit">{action === 'create' ? 'Add' : 'Rename'}</Button></DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent data-id="delete-product-dialog"><AlertDialogHeader><AlertDialogTitle>Delete “{activeProduct?.label}”?</AlertDialogTitle><AlertDialogDescription>This removes its configured items.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className={cn(buttonVariants({ variant: 'destructive' }))} onClick={onDelete}>Delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
