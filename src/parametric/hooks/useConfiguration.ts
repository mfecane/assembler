import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { createConfigurationFields } from '@/parametric/model/createConfigurationFields'
import type { GraphInputValue } from '@/parametric/model/GraphDocumentModel'

export function useConfiguration() {
	const controller = useEditorController()
	const { document, activeGraphId, activeRootGraphId, evaluationRevision } = useGraphSnapshot()
	const isRootGraphOpen = activeGraphId === activeRootGraphId
	const activeGraph = document.requireGraph(activeGraphId)
	const rootGraph = document.requireGraph(activeRootGraphId)
	const fields = createConfigurationFields(
		document,
		activeGraphId,
		Object.fromEntries(activeGraph.inputs.flatMap((input) => {
			const value = isRootGraphOpen
				? document.getRootInputValue(activeRootGraphId, input.id)
				: input.defaultValue
			return value === undefined ? [] : [[input.id, value]]
		}))
	)
	const setValue = useCallback((inputId: string, value: GraphInputValue) => {
		if (isRootGraphOpen) {
			controller.setRootInputValue(activeRootGraphId, inputId, value)
			return
		}
		controller.updateGraphInput(inputId, { defaultValue: value })
	}, [activeRootGraphId, controller, isRootGraphOpen])

	return {
		isRootGraphOpen,
		rootGraphId: activeRootGraphId,
		rootLabel: isRootGraphOpen ? rootGraph.label : activeGraph.label,
		fields,
		setValue,
		evaluationRevision,
	}
}
