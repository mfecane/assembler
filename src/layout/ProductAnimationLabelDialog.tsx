import { useEffect, useState, type FormEvent } from 'react'
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

export function ProductAnimationLabelDialog({
	label,
	open,
	onOpenChange,
	onSave,
}: {
	label: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onSave: (label: string) => void
}) {
	const [value, setValue] = useState(label)

	useEffect(() => {
		if (open) setValue(label)
	}, [label, open])

	const submit = (event: FormEvent) => {
		event.preventDefault()
		const nextLabel = value.trim()
		if (!nextLabel) return
		onSave(nextLabel)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-id="product-animation-label-dialog">
				<form data-id="product-animation-label-form" onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>Animation button label</DialogTitle>
						<DialogDescription>
							This label appears on the animation control in the product viewport.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="product-animation-label-input">Label</Label>
						<Input
							id="product-animation-label-input"
							data-id="product-animation-label-input"
							className="mt-2"
							value={value}
							onChange={(event) => setValue(event.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" disabled={!value.trim()}>Save label</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
