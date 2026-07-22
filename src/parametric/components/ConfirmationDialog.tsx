import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

interface ConfirmationDialogProps {
	open: boolean
	title: string
	message: string
	confirmLabel?: string
	onCancel: () => void
	onConfirm: () => void
}

export function ConfirmationDialog({
	open,
	title,
	message,
	confirmLabel = 'Delete',
	onCancel,
	onConfirm,
}: ConfirmationDialogProps) {
	useEffect(() => {
		if (!open) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onCancel()
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [open, onCancel])

	if (!open) return null

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onCancel()
			}}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirmation-dialog-title"
				aria-describedby="confirmation-dialog-message"
				className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl"
			>
				<h2 id="confirmation-dialog-title" className="m-0 text-base font-semibold text-foreground">
					{title}
				</h2>
				<p id="confirmation-dialog-message" className="mb-5 mt-2 text-sm text-muted-foreground">
					{message}
				</p>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						autoFocus
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body
	)
}
