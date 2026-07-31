import { useSyncExternalStore } from 'react'
import type { EditorControllerSnapshot } from '@/parametric/editor/EditorController'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function useGraphSnapshot(): EditorControllerSnapshot {
	const controller = useEditorController()
	return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}
