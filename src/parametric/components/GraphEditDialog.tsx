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

export function GraphEditDialog({
	open,
	graphId,
	graphLabel,
	isRoot,
	isOnlyRoot,
	configurationControlCount,
	onOpenChange,
	onSave,
}: {
	open: boolean
	graphId: string
	graphLabel: string
	isRoot: boolean
	isOnlyRoot: boolean
	configurationControlCount: number
	onOpenChange: (open: boolean) => void
	onSave: (name: string, root: boolean) => void
}) {
	const [nameDraft, setNameDraft] = useState(graphLabel)
	const [kindDraft, setKindDraft] = useState<GraphKind>(isRoot ? 'root' : 'subgraph')
	const [confirmingDemotion, setConfirmingDemotion] = useState(false)

	useEffect(() => {
		if (!open) return
		setNameDraft(graphLabel)
		setKindDraft(isRoot ? 'root' : 'subgraph')
		setConfirmingDemotion(false)
	}, [graphId, graphLabel, isRoot, open])

	const save = () => {
		const normalizedName = nameDraft.trim()
		if (!normalizedName) return
		onSave(normalizedName, kindDraft === 'root')
		onOpenChange(false)
	}

	const submit = () => {
		if (!nameDraft.trim()) return
		if (isRoot && kindDraft === 'subgraph') {
			setConfirmingDemotion(true)
			return
		}
		save()
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-id="edit-graph-dialog" className="sm:max-w-md">
				{confirmingDemotion ? (
					<div data-id="confirm-graph-demotion">
						<DialogHeader>
							<DialogTitle>Change “{graphLabel}” to a subgraph?</DialogTitle>
							<DialogDescription>
								This permanently removes {configurationControlCount} configuration UI
								 item{configurationControlCount === 1 ? '' : 's'} and all saved root input
								 values. The graph, its inputs, nodes, connections, and instances are preserved.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter className="mt-6">
							<Button
								data-id="cancel-graph-demotion-button"
								type="button"
								variant="outline"
								onClick={() => setConfirmingDemotion(false)}
							>
								Back
							</Button>
							<Button
								data-id="confirm-graph-demotion-button"
								type="button"
								variant="destructive"
								onClick={save}
							>
								Remove configuration and continue
							</Button>
						</DialogFooter>
					</div>
				) : (
					<form
						data-id="edit-graph-form"
						onSubmit={(event) => {
							event.preventDefault()
							submit()
						}}
					>
						<DialogHeader>
							<DialogTitle>Edit graph</DialogTitle>
							<DialogDescription>
								Change the graph name and whether it is a configurable root or reusable subgraph.
							</DialogDescription>
						</DialogHeader>
						<div className="mt-4 grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-graph-name">Name</Label>
								<Input
									id="edit-graph-name"
									data-id="edit-graph-name-input"
									value={nameDraft}
									onChange={(event) => setNameDraft(event.target.value)}
									onFocus={(event) => event.currentTarget.select()}
									autoFocus
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-graph-kind">Type</Label>
								<Select
									value={kindDraft}
									onValueChange={(value) => setKindDraft(value as GraphKind)}
								>
									<SelectTrigger id="edit-graph-kind" data-id="edit-graph-kind-select">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="root">Root graph</SelectItem>
										<SelectItem value="subgraph" disabled={isOnlyRoot}>
											Subgraph
										</SelectItem>
									</SelectContent>
								</Select>
								{isOnlyRoot && (
									<p className="text-xs text-muted-foreground">
										This is the project's only root graph. Create or promote another root first.
									</p>
								)}
							</div>
						</div>
						<DialogFooter className="mt-6">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={!nameDraft.trim()}>
								Save changes
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
