import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function useGraphJson() {
	const controller = useEditorController()
	const exportGraph = useCallback(() => JSON.stringify(controller.exportGraph(), null, 2), [controller])
	const exportAssetMetadata = useCallback(
		() => JSON.stringify(controller.exportAssetMetadata(), null, 2),
		[controller]
	)
	const importGraph = useCallback((json: string) => controller.importGraph(JSON.parse(json)), [controller])

	return { exportGraph, exportAssetMetadata, importGraph }
}
