import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { ConfigurationField } from '@/parametric/model/GraphDocumentModel'

export function useConfiguration() {
	const controller = useEditorController()
	const { document, activeRootGraphId } = useGraphSnapshot()
	const rootGraph = document.requireGraph(activeRootGraphId)
	const values = document.getConfigurationControls(activeRootGraphId).reduce<ConfigurationField[]>(
		(fields, control) => {
			const input = rootGraph.inputs.find((candidate) => candidate.id === control.inputId)
			const value = input
				? document.getRootInputValue(activeRootGraphId, input.id)
				: undefined
			if (!input || value === undefined) return fields
			if (input.valueType === 'number' && typeof value === 'number' && control.type === 'number') {
				fields.push({
					id: input.id,
					type: 'number',
					label: control.label,
					value,
					step: control.step,
				})
			}
			if (input.valueType === 'number' && typeof value === 'number' && control.type === 'slider') {
				const constraint = document.getConfigurationConstraintState(activeRootGraphId, input.id)
				fields.push({
					id: input.id,
					type: 'slider',
					label: control.label,
					value,
					min: control.min,
					max: Math.min(control.max, constraint?.effectiveMaximum ?? control.max),
					step: control.step,
					constraint,
				})
			}
			if (input.valueType === 'enum' && typeof value === 'string' && control.type === 'select') {
				fields.push({
					id: input.id,
					type: 'enum',
					label: control.label,
					value,
					options: document.getInputOptions(input),
				})
			}
			if (input.valueType === 'color' && typeof value === 'string' && control.type === 'color') {
				fields.push({
					id: input.id,
					type: 'color',
					label: control.label,
					value,
					options: control.options,
				})
			}
			if (
				input.valueType === 'boolean'
				&& typeof value === 'boolean'
				&& control.type === 'switch'
			) {
				fields.push({
					id: input.id,
					type: 'boolean',
					label: control.label,
					value,
				})
			}
			return fields
		},
		[]
	)
	const setNumberValue = useCallback(
		(id: string, value: number) => controller.setRootInputValue(activeRootGraphId, id, value),
		[activeRootGraphId, controller]
	)
	const setEnumValue = useCallback(
		(id: string, value: string) => controller.setRootInputValue(activeRootGraphId, id, value),
		[activeRootGraphId, controller]
	)
	const setColorValue = useCallback(
		(id: string, value: string) => controller.setRootInputValue(activeRootGraphId, id, value),
		[activeRootGraphId, controller]
	)
	const setBooleanValue = useCallback(
		(id: string, value: boolean) => controller.setRootInputValue(activeRootGraphId, id, value),
		[activeRootGraphId, controller]
	)

	return {
		rootGraphId: activeRootGraphId,
		rootLabel: rootGraph.label,
		values,
		setNumberValue,
		setEnumValue,
		setColorValue,
		setBooleanValue,
	}
}
