import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/parametric/components/ConfirmationDialog'
import { useGraphActions } from '@/parametric/hooks/useGraphActions'

interface NodeDeleteButtonProps {
	nodeId: string
	nodeLabel: string
}

export function NodeDeleteButton({ nodeId, nodeLabel }: NodeDeleteButtonProps) {
	const { removeNode } = useGraphActions()
	const [confirmationOpen, setConfirmationOpen] = useState(false)
	const closeConfirmation = useCallback(() => setConfirmationOpen(false), [])
	const confirmDeletion = useCallback(() => {
		removeNode(nodeId)
		setConfirmationOpen(false)
	}, [nodeId, removeNode])

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="nodrag nopan h-6 w-6 text-sm leading-none text-muted-foreground"
				aria-label={`Delete ${nodeLabel} node`}
				title="Delete node"
				onClick={() => setConfirmationOpen(true)}
			>
				×
			</Button>
			<ConfirmationDialog
				open={confirmationOpen}
				title={`Delete ${nodeLabel} node?`}
				message="This node and all of its connections will be removed."
				onCancel={closeConfirmation}
				onConfirm={confirmDeletion}
			/>
		</>
	)
}
