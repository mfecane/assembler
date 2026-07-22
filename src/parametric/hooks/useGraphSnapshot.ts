import { useSyncExternalStore } from 'react'
import type { GraphControllerSnapshot } from '@/parametric/controller/GraphController'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'

export function useGraphSnapshot(): GraphControllerSnapshot {
	const controller = useGraphController()
	return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}
