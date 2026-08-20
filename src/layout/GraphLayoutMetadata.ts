import type {
	GraphDefinitionReader,
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import { Vector3Value } from '@/parametric/model/Vector3Value'

export const layoutAxisRoles = ['primary', 'secondary', 'tertiary'] as const
export type LayoutAxisRole = typeof layoutAxisRoles[number]
export type LayoutAxisComponent = 'x' | 'y' | 'z'

export interface RootGraphAxisBinding {
	inputId: string
	component?: LayoutAxisComponent
}

export interface RootGraphLayoutMetadata {
	axisBinding: Partial<Record<LayoutAxisRole, RootGraphAxisBinding>>
}

export interface LayoutInstanceMetadata {
	axisBinding: Partial<Record<LayoutAxisRole, string>>
}

export interface GraphLayoutBindingOption {
	path: string
	label: string
}

export function copyLayoutInstanceMetadata(
	metadata: LayoutInstanceMetadata | undefined
): LayoutInstanceMetadata | undefined {
	return metadata ? { axisBinding: { ...metadata.axisBinding } } : undefined
}

export function copyRootGraphLayoutMetadata(
	metadata: RootGraphLayoutMetadata | undefined
): RootGraphLayoutMetadata | undefined {
	return metadata
		? {
			axisBinding: Object.fromEntries(
				Object.entries(metadata.axisBinding).map(([role, binding]) => [role, { ...binding }])
			),
		}
		: undefined
}

export function getGraphLayoutBindingOptions(
	graph: GraphDefinitionReader
): GraphLayoutBindingOption[] {
	return graph.inputs.flatMap((input) => {
		if (input.valueType === 'number') return [{ path: input.id, label: input.label }]
		if (input.valueType !== 'vector3') return []
		return (['x', 'y', 'z'] as const).map((component) => ({
			path: `${input.id}.${component}`,
			label: `${input.label} · ${component.toUpperCase()}`,
		}))
	})
}

export function assertLayoutInstanceMetadata(
	graph: GraphDefinitionReader,
	metadata: LayoutInstanceMetadata | undefined
): void {
	if (!metadata) return
	for (const role of layoutAxisRoles) {
		const path = metadata.axisBinding[role]
		if (path !== undefined) requireBindingInput(graph, path, role)
	}
}

export function assertRootGraphLayoutMetadata(
	graph: GraphDefinitionReader,
	metadata: RootGraphLayoutMetadata | undefined
): void {
	if (!metadata) return
	for (const role of layoutAxisRoles) {
		const binding = metadata.axisBinding[role]
		if (binding !== undefined) requireRootBindingInput(graph, binding, role)
	}
}

export function resolveGraphLayoutAxis(
	graph: GraphDefinitionReader,
	inputValues: Record<string, GraphInputValue>,
	metadata: LayoutInstanceMetadata | undefined,
	role: LayoutAxisRole
): number | undefined {
	const path = metadata?.axisBinding[role]
	if (!path) return undefined
	const { input, component } = requireBindingInput(graph, path, role)
	const value = inputValues[input.id] ?? input.defaultValue
	const resolved = component && Vector3Value.isSnapshot(value)
		? value[component]
		: typeof value === 'number'
			? value
			: undefined
	if (!Number.isFinite(resolved) || (resolved as number) <= 0) {
		throw new Error(
			`Graph "${graph.id}" layout ${role} axis binding "${path}" resolved to `
			+ `${JSON.stringify(resolved)}. Layout dimensions must resolve to a positive finite number. `
			+ `Instance overrides: ${JSON.stringify(inputValues)}.`
		)
	}
	return resolved
}

function requireBindingInput(
	graph: GraphDefinitionReader,
	path: string,
	role: LayoutAxisRole
): { input: GraphInputDefinition; component?: 'x' | 'y' | 'z' } {
	const componentMatch = path.match(/^(.*)\.([xyz])$/)
	const inputId = componentMatch?.[1] ?? path
	const component = componentMatch?.[2] as 'x' | 'y' | 'z' | undefined
	const input = graph.inputs.find((candidate) => candidate.id === inputId)
	if (
		!input
		|| (component ? input.valueType !== 'vector3' : input.valueType !== 'number')
	) {
		throw new Error(
			`Graph "${graph.id}" layout ${role} axis binding "${path}" is invalid. Expected `
			+ 'a number input ID or a vector3 input path ending in .x, .y, or .z. Available bindings: '
			+ `${JSON.stringify(getGraphLayoutBindingOptions(graph).map((option) => option.path))}.`
		)
	}
	return { input, ...(component ? { component } : {}) }
}

function requireRootBindingInput(
	graph: GraphDefinitionReader,
	binding: RootGraphAxisBinding,
	role: LayoutAxisRole
): GraphInputDefinition {
	const input = graph.inputs.find((candidate) => candidate.id === binding.inputId)
	const validComponent = binding.component === undefined || ['x', 'y', 'z'].includes(binding.component)
	if (
		!input
		|| !validComponent
		|| (binding.component ? input.valueType !== 'vector3' : input.valueType !== 'number')
	) {
		throw new Error(
			`Graph "${graph.id}" root layout ${role} axis binding ${JSON.stringify(binding)} is invalid. `
			+ 'Expected a number input without a component or a vector3 input with x, y, or z. '
			+ `Available bindings: ${JSON.stringify(getGraphLayoutBindingOptions(graph).map((option) => option.path))}.`
		)
	}
	return input
}
