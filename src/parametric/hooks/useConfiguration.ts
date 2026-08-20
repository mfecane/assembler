import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type {
	ConfigurationField,
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function useConfiguration() {
	const controller = useEditorController()
	const { document, activeGraphId, activeRootGraphId } = useGraphSnapshot()
	const activeGraph = document.requireGraph(activeGraphId)
	const isRootGraphOpen = activeGraphId === activeRootGraphId
	const rootGraph = document.requireGraph(activeRootGraphId)
	const values = isRootGraphOpen
		? document.getConfigurationControls(activeRootGraphId).reduce<ConfigurationField[]>(
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
			if (
				input.valueType === 'numberArray'
				&& Array.isArray(value)
				&& control.type === 'numberArray'
			) {
				fields.push({
					id: input.id,
					type: 'numberArray',
					label: control.label,
					value,
					labels: control.labels,
					total: control.total,
					step: control.step,
				})
			}
			if (input.valueType === 'enum' && typeof value === 'number' && control.type === 'select') {
				fields.push({
					id: input.id,
					type: 'enum',
					label: control.label,
					value,
					options: document.getInputOptions(input),
				})
			}
			if (
				input.valueType === 'materialInstance'
				&& typeof value === 'string'
				&& control.type === 'material'
			) {
				fields.push({
					id: input.id,
					type: 'material',
					label: control.label,
					value,
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
	const setNumberValue = useCallback(
		(id: string, value: number) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setEnumValue = useCallback(
		(id: string, value: number) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setMaterialValue = useCallback(
		(id: string, value: string) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setColorValue = useCallback(
		(id: string, value: string) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setVector3Value = useCallback(
		(id: string, value: Vector3Snapshot) => (
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, value)
		),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setBooleanValue = useCallback(
		(id: string, value: boolean) => setInputValue(controller, activeGraphId, isRootGraphOpen, id, value),
		[activeGraphId, controller, isRootGraphOpen]
	)
	const setNumberArrayValue = useCallback(
		(id: string, index: number, value: number) => {
			const field = values.find((candidate) => candidate.id === id)
			if (field?.type !== 'numberArray') return
			const next = field.value.map((item, candidateIndex) =>
				candidateIndex === index
					? Math.max(0, value)
					: item
			)
			if (field.type === 'numberArray' && field.total !== undefined) {
				const otherTotal = field.value.reduce(
					(total, item, candidateIndex) => total + (candidateIndex === index ? 0 : item),
					0
				)
				next[index] = Math.min(next[index], Math.max(0, field.total - otherTotal))
			}
			setInputValue(controller, activeGraphId, isRootGraphOpen, id, next)
		},
		[activeGraphId, controller, isRootGraphOpen, values]
	)

	return {
		isRootGraphOpen,
		rootGraphId: activeRootGraphId,
		rootLabel: isRootGraphOpen ? rootGraph.label : activeGraph.label,
		values,
		setNumberValue,
		setEnumValue,
		setMaterialValue,
		setColorValue,
		setVector3Value,
		setBooleanValue,
		setNumberArrayValue,
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
