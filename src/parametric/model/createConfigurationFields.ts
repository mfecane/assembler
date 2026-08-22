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
	return graph.inputs.flatMap((input): ConfigurationField[] => {
		const value = inputValues[input.id] ?? input.defaultValue
		if (value === undefined) return []
		if (input.valueType === 'number' && typeof value === 'number') {
			return [{ id: input.id, type: 'number', label: input.label, value, step: 0.1 }]
		}
		if (input.valueType === 'enum' && typeof value === 'number') {
			return [{
				id: input.id,
				type: 'enum',
				label: input.label,
				value,
				options: document.getInputOptions(input),
			}]
		}
		if (input.valueType === 'materialInstance' && typeof value === 'string') {
			return [{ id: input.id, type: 'material', label: input.label, value }]
		}
		if (input.valueType === 'color' && typeof value === 'string') {
			return [{ id: input.id, type: 'color', label: input.label, value }]
		}
		if (
			input.valueType === 'vector3'
			&& value !== null
			&& typeof value === 'object'
			&& !Array.isArray(value)
			&& Number.isFinite(value.x)
			&& Number.isFinite(value.y)
			&& Number.isFinite(value.z)
		) {
			return [{ id: input.id, type: 'vector3', label: input.label, value, step: 0.1 }]
		}
		if (input.valueType === 'boolean' && typeof value === 'boolean') {
			return [{ id: input.id, type: 'boolean', label: input.label, value }]
		}
		if (
			input.valueType === 'primitiveArray'
			&& Array.isArray(value)
			&& value.every((item) => typeof item === 'number' || typeof item === 'boolean')
		) {
			return [{
				id: input.id,
				type: 'primitiveArray',
				label: input.label,
				value,
				elementType: input.enumId ? 'enum' : value.every((item) => typeof item === 'boolean')
					? 'boolean'
					: 'number',
				options: input.enumId ? document.getInputOptions(input) : [],
			}]
		}
		return []
	})
}
