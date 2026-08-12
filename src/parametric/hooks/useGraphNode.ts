import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import {
	EnumNumberMapGraphNode,
	type EnumNumberMapping,
	type GeometrySwitchCase,
	GeometrySwitchGraphNode,
	GeometryToggleGraphNode,
	MaterialGraphNode,
	type MeshSelection,
	MeshSelectorGraphNode,
	SelectorGraphNode,
	SumGraphNode,
	type TransformOrigin,
	TransformGraphNode,
} from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { MeshDescriptor } from '@/parametric/model/MeshCatalog'

export interface FieldBinding<T> {
	value: T
	setValue: (value: T) => void
}

export type NumericFieldBinding = FieldBinding<number>

export function useField<T>(nodeId: string, field: string, fallback: T): FieldBinding<T> {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const storedValue = model.getFieldValue(nodeId, field)
	const setValue = useCallback(
		(next: T) => controller.setFieldValue(nodeId, field, next),
		[controller, nodeId, field]
	)

	return { value: storedValue === undefined ? fallback : storedValue as T, setValue }
}

export function useNumericField(nodeId: string, field: string, _label?: string): NumericFieldBinding {
	return useField(nodeId, field, 0)
}

export function useVectorNumericFields(nodeId: string, field: string, label: string) {
	return {
		x: useNumericField(nodeId, `${field}.x`, `${label} X`),
		y: useNumericField(nodeId, `${field}.y`, `${label} Y`),
		z: useNumericField(nodeId, `${field}.z`, `${label} Z`),
	}
}

export interface SelectorNodeBinding {
	options: string[]
	setOptions: (options: string[]) => void
}

export function useSelectorNode(nodeId: string): SelectorNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setOptions = useCallback(
		(options: string[]) => controller.setSelectorOptions(nodeId, options),
		[controller, nodeId]
	)

	if (!(node instanceof SelectorGraphNode)) return undefined
	return { options: node.getOptions(), setOptions }
}

export interface MeshSelectorNodeBinding {
	selections: MeshSelection[]
	availableMeshes: MeshDescriptor[]
	availableEnumValues: string[]
	setSelections: (selections: MeshSelection[]) => void
}

export function useMeshSelectorNode(nodeId: string): MeshSelectorNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setSelections = useCallback(
		(selections: MeshSelection[]) => controller.setMeshSelections(nodeId, selections),
		[controller, nodeId]
	)

	if (!(node instanceof MeshSelectorGraphNode)) return undefined
	return {
		selections: node.getSelections(),
		availableMeshes: controller.getSelectableMeshes(),
		availableEnumValues: model.getInputOptions(nodeId, 'enum'),
		setSelections,
	}
}

export interface EnumNumberMapNodeBinding {
	mappings: EnumNumberMapping[]
	availableEnumValues: string[]
	setMappings: (mappings: EnumNumberMapping[]) => void
}

export function useEnumNumberMapNode(nodeId: string): EnumNumberMapNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setMappings = useCallback(
		(mappings: EnumNumberMapping[]) => controller.setEnumNumberMappings(nodeId, mappings),
		[controller, nodeId]
	)

	if (!(node instanceof EnumNumberMapGraphNode)) return undefined
	return {
		mappings: node.getMappings(),
		availableEnumValues: model.getInputOptions(nodeId, 'enum'),
		setMappings,
	}
}

export interface GeometrySwitchNodeBinding {
	cases: GeometrySwitchCase[]
}

export function useGeometrySwitchNode(nodeId: string): GeometrySwitchNodeBinding | undefined {
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)

	if (!(node instanceof GeometrySwitchGraphNode)) return undefined
	return { cases: node.getCases() }
}

export interface GeometryToggleNodeBinding {
	enabled: boolean
	enabledConnected: boolean
	setEnabled: (enabled: boolean) => void
}

export function useGeometryToggleNode(nodeId: string): GeometryToggleNodeBinding | undefined {
	const controller = useEditorController()
	const { activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setEnabled = useCallback(
		(enabled: boolean) => controller.setFieldValue(nodeId, 'enabled', enabled),
		[controller, nodeId]
	)

	if (!(node instanceof GeometryToggleGraphNode)) return undefined
	const enabledEdge = model.getEdges().find(
		(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'enabled'
	)
	const connectedValue = enabledEdge?.sourcePort
		? controller.evaluateOutput(activeGraphId, enabledEdge.sourceNodeId, enabledEdge.sourcePort)
		: undefined
	const connectedEnabled = connectedValue?.valueType === 'boolean'
		&& typeof connectedValue.value === 'boolean'
		? connectedValue.value
		: undefined

	return {
		enabled: connectedEnabled ?? node.getEnabled(),
		enabledConnected: connectedEnabled !== undefined,
		setEnabled,
	}
}

export interface MaterialNodeBinding {
	color: string
	colorConnected: boolean
	setColor: (color: string) => void
}

export function useMaterialNode(nodeId: string): MaterialNodeBinding | undefined {
	const controller = useEditorController()
	const { activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setColor = useCallback(
		(color: string) => controller.setFieldValue(nodeId, 'color', color),
		[controller, nodeId]
	)

	if (!(node instanceof MaterialGraphNode)) return undefined
	const colorEdge = model.getEdges().find(
		(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'color'
	)
	const connectedValue = colorEdge?.sourcePort
		? controller.evaluateOutput(activeGraphId, colorEdge.sourceNodeId, colorEdge.sourcePort)
		: undefined
	const connectedColor = connectedValue?.valueType === 'color' && typeof connectedValue.value === 'string'
		? connectedValue.value
		: undefined
	return {
		color: connectedColor ?? node.getColor(),
		colorConnected: Boolean(connectedColor),
		setColor,
	}
}

export interface GroupNodeBinding {
	connectedInputCount: number
}

export function useGroupNode(nodeId: string): GroupNodeBinding {
	const { model } = useGraphSnapshot()
	return {
		connectedInputCount: model.getEdges().filter(
			(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'geometry'
		).length,
	}
}

export interface SumNodeBinding {
	constant: number
	enabled: boolean
	enabledConnected: boolean
	inputConnected: boolean
	setConstant: (value: number) => void
	setEnabled: (value: boolean) => void
}

export function useSumNode(nodeId: string): SumNodeBinding | undefined {
	const controller = useEditorController()
	const { activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setConstant = useCallback(
		(value: number) => controller.setFieldValue(nodeId, 'constant', value),
		[controller, nodeId]
	)
	const setEnabled = useCallback(
		(value: boolean) => controller.setFieldValue(nodeId, 'enabled', value),
		[controller, nodeId]
	)

	if (!(node instanceof SumGraphNode)) return undefined
	const enabledEdge = model.getEdges().find(
		(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'enabled'
	)
	const connectedValue = enabledEdge?.sourcePort
		? controller.evaluateOutput(activeGraphId, enabledEdge.sourceNodeId, enabledEdge.sourcePort)
		: undefined
	const connectedEnabled = connectedValue?.valueType === 'boolean'
		&& typeof connectedValue.value === 'boolean'
		? connectedValue.value
		: undefined

	return {
		constant: node.getConstant(),
		enabled: connectedEnabled ?? node.getEnabled(),
		enabledConnected: connectedEnabled !== undefined,
		inputConnected: model.getEdges().some(
			(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'number'
		),
		setConstant,
		setEnabled,
	}
}

export interface TransformNodeBinding {
	scale: Vector3Snapshot
	origin: TransformOrigin
	copy: boolean
	uniformScale: boolean
	enabled: boolean
	enabledConnected: boolean
	setScale: (value: Vector3Snapshot) => void
	setOrigin: (value: TransformOrigin) => void
	setCopy: (value: boolean) => void
	setUniformScale: (value: boolean) => void
	setEnabled: (value: boolean) => void
}

export function useTransformNode(nodeId: string): TransformNodeBinding | undefined {
	const controller = useEditorController()
	const { activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setScale = useCallback(
		(value: Vector3Snapshot) => controller.setTransformScale(nodeId, value),
		[controller, nodeId]
	)
	const setOrigin = useCallback(
		(value: TransformOrigin) => {
			if (!(node instanceof TransformGraphNode)) return
			const current = node.getOrigin()
			const changedAxis = (['x', 'y', 'z'] as const).find(
				(axis) => current[axis] !== value[axis]
			)
			if (changedAxis) controller.setFieldValue(nodeId, `origin.${changedAxis}`, value[changedAxis])
		},
		[controller, node, nodeId]
	)
	const setCopy = useCallback(
		(value: boolean) => controller.setFieldValue(nodeId, 'copy', value),
		[controller, nodeId]
	)
	const setUniformScale = useCallback(
		(value: boolean) => controller.setTransformUniformScale(nodeId, value),
		[controller, nodeId]
	)
	const setEnabled = useCallback(
		(value: boolean) => controller.setFieldValue(nodeId, 'enabled', value),
		[controller, nodeId]
	)

	if (!(node instanceof TransformGraphNode)) return undefined
	const enabledEdge = model.getEdges().find(
		(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'enabled'
	)
	const connectedValue = enabledEdge?.sourcePort
		? controller.evaluateOutput(activeGraphId, enabledEdge.sourceNodeId, enabledEdge.sourcePort)
		: undefined
	const connectedEnabled = connectedValue?.valueType === 'boolean'
		&& typeof connectedValue.value === 'boolean'
		? connectedValue.value
		: undefined
	return {
		scale: node.getScale().toSnapshot(),
		origin: node.getOrigin(),
		copy: node.getCopy(),
		uniformScale: node.getUniformScale(),
		enabled: connectedEnabled ?? node.getEnabled(),
		enabledConnected: connectedEnabled !== undefined,
		setScale,
		setOrigin,
		setCopy,
		setUniformScale,
		setEnabled,
	}
}
