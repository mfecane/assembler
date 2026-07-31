import { useCallback } from 'react'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import {
	ArrayGraphNode,
	type Axis,
	ColorGraphNode,
	GroupGraphNode,
	MaterialGraphNode,
	MeshAssetGraphNode,
	type MeshSelection,
	MeshSelectorGraphNode,
	NumberInputGraphNode,
	PrimitiveGraphNode,
	type PrimitiveKind,
	SelectorGraphNode,
	SumGraphNode,
	type TransformOrigin,
	TransformGraphNode,
} from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { MeshDescriptor } from '@/parametric/model/MeshCatalog'

export interface NumericFieldBinding {
	value: number
	setValue: (value: number) => void
}

export function useNumericField(nodeId: string, field: string, _label?: string): NumericFieldBinding {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const value = model.getNumericValue(nodeId, field) ?? 0
	const setValue = useCallback(
		(next: number) => controller.setNumericValue(nodeId, field, next),
		[controller, nodeId, field]
	)

	return { value, setValue }
}

export function useVectorNumericFields(nodeId: string, field: string, label: string) {
	return {
		x: useNumericField(nodeId, `${field}.x`, `${label} X`),
		y: useNumericField(nodeId, `${field}.y`, `${label} Y`),
		z: useNumericField(nodeId, `${field}.z`, `${label} Z`),
	}
}

export interface PrimitiveNodeBinding {
	primitive: PrimitiveKind
	size: Vector3Snapshot
	setPrimitive: (value: PrimitiveKind) => void
	setSize: (value: Vector3Snapshot) => void
}

export function usePrimitiveNode(nodeId: string): PrimitiveNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setPrimitive = useCallback(
		(value: PrimitiveKind) => controller.setPrimitive(nodeId, value),
		[controller, nodeId]
	)
	const setSize = useCallback(
		(value: Vector3Snapshot) => controller.setPrimitiveSize(nodeId, value),
		[controller, nodeId]
	)

	if (!(node instanceof PrimitiveGraphNode)) return undefined
	return { primitive: node.getPrimitive(), size: node.getSize().toSnapshot(), setPrimitive, setSize }
}

export interface NumberInputNodeBinding {
	label: string
	value: number
	setLabel: (label: string) => void
	setValue: (value: number) => void
}

export function useNumberInputNode(nodeId: string): NumberInputNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setLabel = useCallback(
		(label: string) => controller.setNumberInputLabel(nodeId, label),
		[controller, nodeId]
	)
	const setValue = useCallback(
		(value: number) => controller.setNumericValue(nodeId, 'value', value),
		[controller, nodeId]
	)

	if (!(node instanceof NumberInputGraphNode)) return undefined
	return { label: node.getLabel(), value: node.getValue(), setLabel, setValue }
}

export interface SelectorNodeBinding {
	label: string
	options: string[]
	value: string
	setLabel: (label: string) => void
	setOptions: (options: string[]) => void
	setValue: (value: string) => void
}

export function useSelectorNode(nodeId: string): SelectorNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setLabel = useCallback(
		(label: string) => controller.setSelectorLabel(nodeId, label),
		[controller, nodeId]
	)
	const setOptions = useCallback(
		(options: string[]) => controller.setSelectorOptions(nodeId, options),
		[controller, nodeId]
	)
	const setValue = useCallback(
		(value: string) => controller.setSelectorValue(nodeId, value),
		[controller, nodeId]
	)

	if (!(node instanceof SelectorGraphNode)) return undefined
	return {
		label: node.getLabel(),
		options: node.getOptions(),
		value: node.getValue(),
		setLabel,
		setOptions,
		setValue,
	}
}

export interface ColorNodeBinding {
	label: string
	color: string
	setLabel: (label: string) => void
	setColor: (color: string) => void
}

export function useColorNode(nodeId: string): ColorNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setLabel = useCallback(
		(label: string) => controller.setColorNodeLabel(nodeId, label),
		[controller, nodeId]
	)
	const setColor = useCallback(
		(color: string) => controller.setColorNodeValue(nodeId, color),
		[controller, nodeId]
	)

	if (!(node instanceof ColorGraphNode)) return undefined
	return { label: node.getLabel(), color: node.getColor(), setLabel, setColor }
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

export interface MeshAssetNodeBinding {
	meshId: string
	availableMeshes: MeshDescriptor[]
	setMeshId: (meshId: string) => void
}

export function useMeshAssetNode(nodeId: string): MeshAssetNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setMeshId = useCallback(
		(meshId: string) => controller.setMeshAsset(nodeId, meshId),
		[controller, nodeId]
	)

	if (!(node instanceof MeshAssetGraphNode)) return undefined
	return {
		meshId: node.getMeshId(),
		availableMeshes: controller.getSelectableMeshes(),
		setMeshId,
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
		(color: string) => controller.setMaterialColor(nodeId, color),
		[controller, nodeId]
	)

	if (!(node instanceof MaterialGraphNode)) return undefined
	const colorEdge = model.getEdges().find(
		(edge) => edge.targetNodeId === nodeId && edge.targetPort === 'color'
	)
	const connectedValue = colorEdge?.sourcePort
		? controller.evaluateOutput(
			activeGraphId,
			colorEdge.sourceNodeId,
			colorEdge.sourcePort
		)
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

export interface ArrayNodeBinding {
	count: number
	axis: Axis
	offset: number
	setCount: (value: number) => void
	setAxis: (value: Axis) => void
	setOffset: (value: number) => void
}

export function useArrayNode(nodeId: string): ArrayNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setCount = useCallback(
		(value: number) => controller.setNumericValue(nodeId, 'count', value),
		[controller, nodeId]
	)
	const setAxis = useCallback(
		(value: Axis) => controller.setArrayAxis(nodeId, value),
		[controller, nodeId]
	)
	const setOffset = useCallback(
		(value: number) => controller.setNumericValue(nodeId, 'offset', value),
		[controller, nodeId]
	)

	if (!(node instanceof ArrayGraphNode)) return undefined
	return {
		count: node.getCount(),
		axis: node.getAxis(),
		offset: node.getOffset(),
		setCount,
		setAxis,
		setOffset,
	}
}

export interface GroupNodeBinding {
	inputPorts: Array<{ id: string; connected: boolean }>
}

export function useGroupNode(nodeId: string): GroupNodeBinding | undefined {
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	if (!(node instanceof GroupGraphNode)) return undefined

	const connectedPortIds = new Set(
		model
			.getEdges()
			.filter((edge) => edge.targetNodeId === nodeId && edge.targetPort)
			.map((edge) => edge.targetPort as string)
	)

	return {
		inputPorts: node.getInputPortIds().map((id) => ({ id, connected: connectedPortIds.has(id) })),
	}
}

export interface SumNodeBinding {
	constant: number
	inputPorts: Array<{ id: string; connected: boolean }>
	setConstant: (value: number) => void
}

export function useSumNode(nodeId: string): SumNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setConstant = useCallback(
		(value: number) => controller.setNumericValue(nodeId, 'constant', value),
		[controller, nodeId]
	)

	if (!(node instanceof SumGraphNode)) return undefined
	const connectedPortIds = new Set(
		model
			.getEdges()
			.filter((edge) => edge.targetNodeId === nodeId && edge.targetPort)
			.map((edge) => edge.targetPort as string)
	)

	return {
		constant: node.getConstant(),
		inputPorts: node.getInputPortIds().map((id) => ({
			id,
			connected: connectedPortIds.has(id),
		})),
		setConstant,
	}
}

export interface TransformNodeBinding {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
	origin: TransformOrigin
	copy: boolean
	uniformScale: boolean
	setTranslation: (value: Vector3Snapshot) => void
	setRotation: (value: Vector3Snapshot) => void
	setScale: (value: Vector3Snapshot) => void
	setOrigin: (value: TransformOrigin) => void
	setCopy: (value: boolean) => void
	setUniformScale: (value: boolean) => void
}

export function useTransformNode(nodeId: string): TransformNodeBinding | undefined {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const setTranslation = useCallback(
		(value: Vector3Snapshot) => controller.setTransformTranslation(nodeId, value),
		[controller, nodeId]
	)
	const setRotation = useCallback(
		(value: Vector3Snapshot) => controller.setTransformRotation(nodeId, value),
		[controller, nodeId]
	)
	const setScale = useCallback(
		(value: Vector3Snapshot) => controller.setTransformScale(nodeId, value),
		[controller, nodeId]
	)
	const setOrigin = useCallback(
		(value: TransformOrigin) => controller.setTransformOrigin(nodeId, value),
		[controller, nodeId]
	)
	const setCopy = useCallback(
		(value: boolean) => controller.setTransformCopy(nodeId, value),
		[controller, nodeId]
	)
	const setUniformScale = useCallback(
		(value: boolean) => controller.setTransformUniformScale(nodeId, value),
		[controller, nodeId]
	)

	if (!(node instanceof TransformGraphNode)) return undefined
	return {
		translation: node.getTranslation().toSnapshot(),
		rotation: node.getRotation().toSnapshot(),
		scale: node.getScale().toSnapshot(),
		origin: node.getOrigin(),
		copy: node.getCopy(),
		uniformScale: node.getUniformScale(),
		setTranslation,
		setRotation,
		setScale,
		setOrigin,
		setCopy,
		setUniformScale,
	}
}
