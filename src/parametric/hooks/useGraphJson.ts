import { useCallback } from 'react'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'

export function useGraphJson() {
	const controller = useGraphController()
	const exportGraph = useCallback(() => JSON.stringify(controller.exportGraph(), null, 2), [controller])
	const exportAssetMetadata = useCallback(
		() => JSON.stringify(controller.exportAssetMetadata(), null, 2),
		[controller]
	)
	const importGraph = useCallback((json: string) => controller.importGraph(JSON.parse(json)), [controller])

	return { exportGraph, exportAssetMetadata, importGraph }
}
