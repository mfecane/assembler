import { useEffect } from 'react'

export function useNodeSelectorShortcut(setOpen: (open: boolean) => void): void {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.code !== 'Space'
				|| event.ctrlKey
				|| event.metaKey
				|| event.altKey
				|| event.shiftKey
				|| isInteractiveTarget(event.target)
			) return

			event.preventDefault()
			setOpen(true)
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [setOpen])
}

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof Element && Boolean(target.closest(
		'input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]'
	))
}
