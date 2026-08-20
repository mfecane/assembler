import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import {
	ChoiceToBooleanMapGraphNode,
	type ChoiceBooleanMapping,
	ChoiceToScalarMapGraphNode,
	type ChoiceScalarMapping,
	ChoiceToVector3MapGraphNode,
	type ChoiceVector3Mapping,
	type ChoiceMeshMapping,
	ChoiceToMeshMapGraphNode,
	GeometryToggleGraphNode,
	SumGraphNode,
	type TransformOrigin,
	TransformGraphNode,
} from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { getMathExpressionVisibleInputIndexes } from '@/parametric/model/MathExpression'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

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

export interface MathExpressionNodeBinding {
	expression: FieldBinding<string>
	inputIndexes: number[]
	placeholderInputIndex: number | null
}

export function useMathExpressionNode(nodeId: string): MathExpressionNodeBinding {
	const expression = useField(nodeId, 'expression', '= $x')
	const { model } = useGraphSnapshot()
	const occupiedIndexes = model.getEdges().flatMap((edge) => {
		if (edge.targetNodeId !== nodeId || edge.targetPort === null) return []
		const index = Number(edge.targetPort)
		return Number.isInteger(index) && index >= 0 ? [index] : []
	})
	const inputIndexes = getMathExpressionVisibleInputIndexes(occupiedIndexes)
	const lastInputIndex = inputIndexes[inputIndexes.length - 1]
	return {
		expression,
		inputIndexes,
		placeholderInputIndex: lastInputIndex !== undefined && !occupiedIndexes.includes(lastInputIndex)
			? lastInputIndex
			: null,
	}
}

export interface ChoiceToScalarMapNodeBinding {
	mappings: ChoiceScalarMapping[]
	availableEnumOptions: string[]
	setMappings: (mappings: ChoiceScalarMapping[]) => void
}

export interface ChoiceToBooleanMapNodeBinding {
	mappings: ChoiceBooleanMapping[]
	availableEnumOptions: string[]
	setMappings: (mappings: ChoiceBooleanMapping[]) => void
}

export function useChoiceToBooleanMapNode(nodeId: string): ChoiceToBooleanMapNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setMappings = useCallback(
		(mappings: ChoiceBooleanMapping[]) => controller.setChoiceBooleanMappings(nodeId, mappings),
		[controller, nodeId]
	)

	if (!(node instanceof ChoiceToBooleanMapGraphNode)) return undefined
	return {
		mappings: node.getMappings(),
		availableEnumOptions: model.getInputOptions(nodeId, 'enum'),
		setMappings,
	}
}

export function useChoiceToScalarMapNode(nodeId: string): ChoiceToScalarMapNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setMappings = useCallback(
		(mappings: ChoiceScalarMapping[]) => controller.setChoiceScalarMappings(nodeId, mappings),
		[controller, nodeId]
	)

	if (!(node instanceof ChoiceToScalarMapGraphNode)) return undefined
	return {
		mappings: node.getMappings(),
		availableEnumOptions: model.getInputOptions(nodeId, 'enum'),
		setMappings,
	}
}

export interface ChoiceToVector3MapNodeBinding {
	mappings: ChoiceVector3Mapping[]
	availableEnumOptions: string[]
	setMappings: (mappings: ChoiceVector3Mapping[]) => void
}

export function useChoiceToVector3MapNode(nodeId: string): ChoiceToVector3MapNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setMappings = useCallback(
		(mappings: ChoiceVector3Mapping[]) => controller.setChoiceVector3Mappings(nodeId, mappings),
		[controller, nodeId]
	)

	if (!(node instanceof ChoiceToVector3MapGraphNode)) return undefined
	return {
		mappings: node.getMappings(),
		availableEnumOptions: model.getInputOptions(nodeId, 'enum'),
		setMappings,
	}
}

export interface ChoiceToMeshMapNodeBinding {
	mappings: ChoiceMeshMapping[]
	availableEnumOptions: string[]
}

export function useChoiceToMeshMapNode(nodeId: string): ChoiceToMeshMapNodeBinding | undefined {
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)

	if (!(node instanceof ChoiceToMeshMapGraphNode)) return undefined
	return {
		mappings: node.getMappings(),
		availableEnumOptions: model.getInputOptions(nodeId, 'enum'),
	}
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
	translationConnected: boolean
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
		translationConnected: model.getEdges().some(
			(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'translation'
		),
		setScale,
		setOrigin,
		setCopy,
		setUniformScale,
		setEnabled,
	}
}
