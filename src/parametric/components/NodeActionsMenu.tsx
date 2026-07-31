import { useEffect, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function NodeActionsMenu({ nodeId }: { nodeId: string }) {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const displayedName = node?.getName() ?? nodeId
	const canDelete = model.isNodeRemovable(nodeId)
	const [menuOpen, setMenuOpen] = useState(false)
	const [renameOpen, setRenameOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [renameDraft, setRenameDraft] = useState(displayedName)

	useEffect(() => {
		if (!renameOpen) setRenameDraft(displayedName)
	}, [displayedName, renameOpen])

	const openRename = () => {
		setRenameDraft(displayedName)
		setMenuOpen(false)
		setRenameOpen(true)
	}

	const submitRename = () => {
		const normalizedName = renameDraft.trim()
		if (!normalizedName) return
		if (normalizedName !== displayedName) controller.setNodeName(nodeId, normalizedName)
		setRenameOpen(false)
	}

	return (
		<>
			<Popover open={menuOpen} onOpenChange={setMenuOpen}>
				<PopoverTrigger asChild>
					<Button
						data-id={`node-actions-menu-button-${nodeId}`}
						type="button"
						variant="ghost"
						size="icon"
						className="nodrag nopan h-6 w-6 shrink-0 text-muted-foreground"
						aria-label={`Open actions for ${displayedName} node`}
						aria-haspopup="menu"
					>
						<MoreHorizontal />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					data-id={`node-actions-menu-${nodeId}`}
					align="end"
					className="nodrag nopan w-44 p-1"
				>
					<div role="menu" aria-label={`Actions for ${displayedName} node`}>
						<Button
							data-id={`rename-node-menu-item-${nodeId}`}
							type="button"
							variant="ghost"
							className="h-9 w-full justify-start px-2 font-normal"
							role="menuitem"
							onClick={openRename}
						>
							<Pencil />
							Rename
						</Button>
						{canDelete && (
							<Button
								data-id={`delete-node-menu-item-${nodeId}`}
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start px-2 font-normal text-destructive hover:text-destructive"
								role="menuitem"
								onClick={() => {
									setMenuOpen(false)
									setDeleteOpen(true)
								}}
							>
								<Trash2 />
								Delete
							</Button>
						)}
					</div>
				</PopoverContent>
			</Popover>
			<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
				<DialogContent data-id={`rename-node-dialog-${nodeId}`} className="sm:max-w-md">
					<form
						data-id={`rename-node-form-${nodeId}`}
						onSubmit={(event) => {
							event.preventDefault()
							submitRename()
						}}
					>
						<DialogHeader>
							<DialogTitle>Rename node</DialogTitle>
							<DialogDescription>
								Choose the name shown in this node's header.
							</DialogDescription>
						</DialogHeader>
						<Input
							data-id={`rename-node-name-input-${nodeId}`}
							value={renameDraft}
							aria-label="Node name"
							className="mt-4"
							onChange={(event) => setRenameDraft(event.target.value)}
							onFocus={(event) => event.currentTarget.select()}
							autoFocus
						/>
						<DialogFooter className="mt-6">
							<Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={!renameDraft.trim()}>
								Rename node
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<ConfirmationDialog
				open={deleteOpen}
				title={`Delete ${displayedName} node?`}
				message="This node and all of its connections will be removed."
				onCancel={() => setDeleteOpen(false)}
				onConfirm={() => {
					controller.removeNode(nodeId)
					setDeleteOpen(false)
				}}
			/>
		</>
	)
}
