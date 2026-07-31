import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { ConfigurationField } from '@/parametric/model/GraphDocumentModel'

export function useConfiguration() {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const entry = document.getEntryGraph()
	const values = document.getConfigurationControls().reduce<ConfigurationField[]>((fields, control) => {
		const input = entry.inputs.find((candidate) => candidate.id === control.inputId)
		const value = input ? document.getEntryInputValue(input.id) : undefined
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
			fields.push({
				id: input.id,
				type: 'slider',
				label: control.label,
				value,
				min: control.min,
				max: control.max,
				step: control.step,
			})
		}
		if (input.valueType === 'enum' && typeof value === 'string' && control.type === 'select') {
			fields.push({
				id: input.id,
				type: 'enum',
				label: control.label,
				value,
				options: input.options ?? [],
			})
		}
		if (input.valueType === 'color' && typeof value === 'string' && control.type === 'color') {
			fields.push({
				id: input.id,
				type: 'color',
				label: control.label,
				value,
			})
		}
		return fields
	}, [])
	const setNumberValue = useCallback(
		(id: string, value: number) => controller.setEntryInputValue(id, value),
		[controller]
	)
	const setEnumValue = useCallback(
		(id: string, value: string) => controller.setEntryInputValue(id, value),
		[controller]
	)
	const setColorValue = useCallback(
		(id: string, value: string) => controller.setEntryInputValue(id, value),
		[controller]
	)

	return { values, setNumberValue, setEnumValue, setColorValue }
}
