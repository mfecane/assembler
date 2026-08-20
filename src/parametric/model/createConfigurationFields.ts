import type {
	ConfigurationField,
	GraphDocumentReader,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export function createConfigurationFields(
	document: GraphDocumentReader,
	graphId: string,
	inputValues: Record<string, GraphInputValue>
): ConfigurationField[] {
	const graph = document.requireGraph(graphId)
	return document.getConfigurationControls(graphId).reduce<ConfigurationField[]>((fields, control) => {
		const input = graph.inputs.find((candidate) => candidate.id === control.inputId)
		const value = inputValues[control.inputId] ?? input?.defaultValue
		if (!input || value === undefined) return fields
		if (input.valueType === 'number' && typeof value === 'number' && control.type === 'number') {
			fields.push({ id: input.id, type: 'number', label: control.label, value, step: control.step })
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
			fields.push({ id: input.id, type: 'material', label: control.label, value })
		}
		if (
			input.valueType === 'boolean'
			&& typeof value === 'boolean'
			&& control.type === 'switch'
		) {
			fields.push({ id: input.id, type: 'boolean', label: control.label, value })
		}
		return fields
	}, [])
}
