import type { ProductConfigurationControl } from '@/layout/LayoutDocument'
import {
	type ConfigurationField,
	type GraphDocumentReader,
	type GraphInputDefinition,
	type GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export type ProductConfigurationViewControl =
	| { id: string; type: 'field'; field: ConfigurationField }
	| {
		id: string
		type: 'sectionList'
		label: string
		fields: Array<{
			id: string
			label: string
			field: ConfigurationField
			widget: 'number' | 'slider' | 'select'
			min?: number
			max?: number
			step?: number
		}>
		sections: Array<Record<string, number>>
	}

export function resolveProductConfiguration(
	document: GraphDocumentReader,
	productId: string
): { header: string; controls: ProductConfigurationViewControl[] } {
	const product = document.getLayout().products.find((item) => item.id === productId)
	if (!product) throw new Error(`Cannot resolve configuration for unknown product "${productId}".`)
	const configuration = product.configuration
	if (!configuration) return { header: 'Configure product', controls: [] }
	return {
		header: configuration.header,
		controls: configuration.controls.map((control) => control.type === 'sectionList'
			? resolveSectionList(document, product, control)
			: {
				id: control.id,
				type: 'field',
				field: createField(
					document,
					product.instances.find((instance) => instance.id === control.target.instanceId),
					control.target.inputId,
					control.label,
					control.type,
					control
				),
			}
		),
	}
}

function resolveSectionList(
	document: GraphDocumentReader,
	product: ReturnType<GraphDocumentReader['getLayout']>['products'][number],
	control: Extract<ProductConfigurationControl, { type: 'sectionList' }>
): ProductConfigurationViewControl {
	const fields = control.fields.map((binding) => {
		const field = createField(
			document,
			product.instances.find((instance) => instance.id === binding.target.instanceId),
			binding.target.inputId,
			binding.label
		)
		return {
			id: binding.id,
			label: binding.label,
			field,
			widget: binding.widget ?? (field.type === 'primitiveArray' && field.elementType === 'enum'
				? 'select'
				: 'number'),
			min: binding.min,
			max: binding.max,
			step: binding.step,
		}
	})
	const arrays = fields.map((field): Extract<ConfigurationField, { type: 'primitiveArray' }> => {
		if (field.field.type !== 'primitiveArray' || !field.field.value.every((item) => typeof item === 'number')) {
			throw new Error(`Section-list field "${field.id}" is not a numeric or choice primitive array.`)
		}
		return field.field
	})
	const length = Math.max(0, ...arrays.map((field) => field.value.length))
	return {
		id: control.id,
		type: 'sectionList',
		label: control.label,
		fields,
		sections: Array.from({ length }, (_, index) => Object.fromEntries(fields.map((field, fieldIndex) => [
			field.id,
			Number(arrays[fieldIndex]?.value[index] ?? getDefaultElement(arrays[fieldIndex]?.value ?? [])),
		]))),
	}
}

function createField(
	document: GraphDocumentReader,
	instance: ReturnType<GraphDocumentReader['getLayout']>['products'][number]['instances'][number] | undefined,
	inputId: string,
	label: string,
	widget?: ProductConfigurationControl['type'],
	settings?: { min?: number; max?: number; step?: number }
): ConfigurationField {
	if (!instance) throw new Error(`Configuration target references missing product item "${inputId}".`)
	const input = document.requireGraph(instance.graphId).inputs.find((candidate) => candidate.id === inputId)
	if (!input) throw new Error(`Configuration target "${inputId}" is not exposed by graph "${instance.graphId}".`)
	const value = instance.inputValues[inputId] ?? input.defaultValue
	if (value === undefined) throw new Error(`Configuration target "${inputId}" has no value or graph default.`)
	return createConfigurationField(document, input, value, label, widget, settings)
}

function createConfigurationField(
	document: GraphDocumentReader,
	input: GraphInputDefinition,
	value: GraphInputValue,
	label: string,
	widget?: ProductConfigurationControl['type'],
	settings?: { min?: number; max?: number; step?: number }
): ConfigurationField {
	if (input.valueType === 'number' && typeof value === 'number') {
		if (widget === 'slider') return {
			id: input.id, type: 'slider', label, value,
			min: settings?.min ?? 0, max: settings?.max ?? 1, step: settings?.step ?? 0.1,
		}
		return {
			id: input.id,
			type: 'number',
			label,
			value,
			min: settings?.min,
			max: settings?.max,
			step: settings?.step ?? 0.1,
		}
	}
	if (input.valueType === 'enum' && typeof value === 'number') return {
		id: input.id, type: 'enum', label, value, options: document.getInputOptions(input),
	}
	if (input.valueType === 'materialInstance' && typeof value === 'string') return { id: input.id, type: 'material', label, value }
	if (input.valueType === 'color' && typeof value === 'string') return { id: input.id, type: 'color', label, value }
	if (input.valueType === 'boolean' && typeof value === 'boolean') return { id: input.id, type: 'boolean', label, value }
	if (input.valueType === 'vector3' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
		return { id: input.id, type: 'vector3', label, value, step: 0.1 }
	}
	if (input.valueType === 'primitiveArray' && Array.isArray(value)) {
		return {
			id: input.id,
			type: 'primitiveArray',
			label,
			value,
			elementType: input.enumId ? 'enum' : 'number',
			options: input.enumId ? document.getInputOptions(input) : [],
		}
	}
	throw new Error(`Cannot render configuration target "${input.id}" with value ${JSON.stringify(value)}.`)
}

function getDefaultElement(values: Array<number | boolean>): number | boolean {
	const value = values[0]
	if (value === undefined) throw new Error('Section-list array has no declared default element.')
	return value
}
