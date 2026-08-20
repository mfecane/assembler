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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

type GraphKind = 'root' | 'subgraph'

export function CreateGraphDialog({
	open,
	onOpenChange,
	onCreate,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate: (name: string, root: boolean) => void
}) {
	const [nameDraft, setNameDraft] = useState('')
	const [kindDraft, setKindDraft] = useState<GraphKind>('subgraph')

	useEffect(() => {
		if (!open) return
		setNameDraft('')
		setKindDraft('subgraph')
	}, [open])

	const create = () => {
		const name = nameDraft.trim()
		if (!name) return
		onCreate(name, kindDraft === 'root')
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-id="create-graph-dialog" className="sm:max-w-md">
				<form
					data-id="create-graph-form"
					onSubmit={(event) => {
						event.preventDefault()
						create()
					}}
				>
					<DialogHeader>
						<DialogTitle>New assembly</DialogTitle>
						<DialogDescription>
							Choose a name and whether this is a configurable root or reusable assembly.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="create-graph-name">Name</Label>
							<Input
								id="create-graph-name"
								data-id="create-graph-name-input"
								value={nameDraft}
								onChange={(event) => setNameDraft(event.target.value)}
								autoFocus
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-graph-kind">Type</Label>
							<Select
								value={kindDraft}
								onValueChange={(value) => setKindDraft(value as GraphKind)}
							>
								<SelectTrigger id="create-graph-kind" data-id="create-graph-kind-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="subgraph">Reusable assembly</SelectItem>
									<SelectItem value="root">Root assembly</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!nameDraft.trim()}>
							Create assembly
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
