import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type {
	ConfigurationField,
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { createConfigurationFields } from '@/parametric/model/createConfigurationFields'

export function useConfiguration() {
	const controller = useEditorController()
	const { document, activeGraphId, activeRootGraphId } = useGraphSnapshot()
	const activeGraph = document.requireGraph(activeGraphId)
	const isRootGraphOpen = activeGraphId === activeRootGraphId
	const rootGraph = document.requireGraph(activeRootGraphId)
	const templates = isRootGraphOpen
		? document.getConfigurationTemplates(activeRootGraphId)
		: []
	const values = isRootGraphOpen
		? createConfigurationFields(
			document,
			activeRootGraphId,
			Object.fromEntries(rootGraph.inputs.flatMap((input) => {
				const value = document.getRootInputValue(activeRootGraphId, input.id)
				return value === undefined ? [] : [[input.id, value]]
			}))
		)
		: activeGraph.inputs.flatMap((input) => {
			if (input.defaultValue === undefined || input.valueType === 'geometry') return []
			return createExportedInputField(
				input.id,
				input.label,
				input.valueType,
				input.defaultValue,
				document.getInputOptions(input)
			)
		})
	const setValue = useCallback(
		(id: string, value: GraphInputValue) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const createTemplate = useCallback(
		(label: string) => controller.createConfigurationTemplate(activeRootGraphId, label),
		[activeRootGraphId, controller]
	)
	const removeTemplate = useCallback(
		(templateId: string) => controller.removeConfigurationTemplate(activeRootGraphId, templateId),
		[activeRootGraphId, controller]
	)
	const updateTemplate = useCallback(
		(templateId: string) => controller.updateConfigurationTemplate(activeRootGraphId, templateId),
		[activeRootGraphId, controller]
	)
	const renameTemplate = useCallback(
		(templateId: string, label: string) => (
			controller.renameConfigurationTemplate(activeRootGraphId, templateId, label)
		),
		[activeRootGraphId, controller]
	)
	const applyTemplate = useCallback(
		(templateId: string) => controller.applyConfigurationTemplate(activeRootGraphId, templateId),
		[activeRootGraphId, controller]
	)

	return {
		isRootGraphOpen,
		rootGraphId: activeRootGraphId,
		rootLabel: isRootGraphOpen ? rootGraph.label : activeGraph.label,
		values,
		templates,
		setValue,
		createTemplate,
		removeTemplate,
		updateTemplate,
		renameTemplate,
		applyTemplate,
	}
}

function createExportedInputField(
	id: string,
	label: string,
	valueType: GraphInputDefinition['valueType'],
	value: GraphInputValue,
	options: string[]
): ConfigurationField[] {
	if (valueType === 'number' && typeof value === 'number') {
		return [{ id, type: 'number', label, value, step: 0.1 }]
	}
	if (valueType === 'numberArray' && Array.isArray(value)) {
		return [{
			id,
			type: 'numberArray',
			label,
			value,
			labels: value.map((_, index) => `Value ${index + 1}`),
			step: 0.1,
		}]
	}
	if (valueType === 'enum' && typeof value === 'number') {
		return [{ id, type: 'enum', label, value, options }]
	}
	if (valueType === 'materialInstance' && typeof value === 'string') {
		return [{ id, type: 'material', label, value }]
	}
	if (valueType === 'color' && typeof value === 'string') {
		return [{ id, type: 'color', label, value }]
	}
	if (valueType === 'vector3' && isVector3Snapshot(value)) {
		return [{ id, type: 'vector3', label, value, step: 0.1 }]
	}
	if (valueType === 'boolean' && typeof value === 'boolean') {
		return [{ id, type: 'boolean', label, value }]
	}
	return []
}

function isVector3Snapshot(value: GraphInputValue): value is Vector3Snapshot {
	return typeof value === 'object' && !Array.isArray(value) && value !== null
		&& typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number'
}

function setInputValue(
	controller: ReturnType<typeof useEditorController>,
	graphId: string,
	isRootGraph: boolean,
	inputId: string,
	value: GraphInputValue
): void {
	if (isRootGraph) {
		controller.setRootInputValue(graphId, inputId, value)
		return
	}
	controller.updateGraphInput(inputId, { defaultValue: value })
}
