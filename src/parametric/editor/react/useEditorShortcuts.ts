import { useEffect } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function useEditorShortcuts(): void {
	const controller = useEditorController()

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey) || isEditableTarget(event.target)) return
			const key = event.key.toLowerCase()
			if (key === 'z' && !event.shiftKey) {
				event.preventDefault()
				controller.undo()
				return
			}
			if ((key === 'z' && event.shiftKey) || key === 'y') {
				event.preventDefault()
				controller.redo()
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [controller])
}

function isEditableTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && (
		target.isContentEditable
		|| target instanceof HTMLInputElement
		|| target instanceof HTMLTextAreaElement
		|| target instanceof HTMLSelectElement
	)
}
