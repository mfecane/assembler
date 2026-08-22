import { AXIS_COLORS } from '@/parametric/components/AxisLabel'
import type { NodePositionUpdate } from '@/parametric/editor/EditorController'
import { useEditor, useEditorController, useReactBridgeSnapshot } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { VectorComponent } from '@/parametric/model/GraphEdge'
import { RepeatInputGraphNode, RepeatOutputGraphNode, type GraphValueType } from '@/parametric/model/GraphNode'
import { RepeatZone } from '@/parametric/model/RepeatZone'
import type { GraphNodeDimensions } from '@/parametric/model/RepeatZone'
import {
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type EdgeMouseHandler,
	type Node,
	type NodeChange,
	type OnConnectEnd,
	type OnConnectStart,
	type OnDelete,
	type ReactFlowInstance,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface FlowNodeData extends Record<string, unknown> {
	width?: number
	height?: number
}

type ParametricFlowNodeType = string

export type ParametricFlowNode = Node<FlowNodeData, ParametricFlowNodeType>

export interface FlowGraphBinding {
	nodes: ParametricFlowNode[]
	edges: Edge[]
	selectedEdges: Edge[]
	onNodesChange: (changes: NodeChange<ParametricFlowNode>[]) => void
	onEdgesChange: (changes: EdgeChange[]) => void
	onDelete: OnDelete<ParametricFlowNode, Edge>
	onConnect: (connection: Connection) => void
	onConnectStart: OnConnectStart
	onConnectEnd: OnConnectEnd
	onInit: (instance: ReactFlowInstance<ParametricFlowNode, Edge>) => void
	isValidConnection: (connection: Connection | Edge) => boolean
	componentSelector: VectorComponentSelectorBinding | null
	connectionTooltip: ConnectionTooltipBinding | null
	onEdgeMouseEnter: EdgeMouseHandler
	onEdgeMouseLeave: EdgeMouseHandler
}

export interface ConnectionTooltipBinding {
	edgeId: string
	position: { x: number; y: number }
	source: string
	sourcePort: string
	sourceValueType: GraphValueType
	target: string
	targetPort: string
	targetValueType: GraphValueType
	component?: VectorComponent
}

export interface VectorComponentSelectorBinding {
	position: { x: number; y: number }
	select: (component: VectorComponent) => void
	cancel: () => void
}

interface PendingVectorComponentConnection {
	sourceNodeId: string
	targetNodeId: string
	sourcePort: string
	targetPort: string
	position: { x: number; y: number }
}

export function useFlowGraph(): FlowGraphBinding {
	const controller = useEditorController()
	const viewportEditor = useEditor().viewport
	const viewportSnapshot = useReactBridgeSnapshot()
	const { activeGraphId, model, revision } = useGraphSnapshot()
	const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(() => new Set())
	const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(() => new Set())
	const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
	const [pendingComponent, setPendingComponent] = useState<PendingVectorComponentConnection | null>(null)
	const [connectionTooltip, setConnectionTooltip] = useState<ConnectionTooltipBinding | null>(null)
	const [connectionDragging, setConnectionDragging] = useState(false)
	const [nodeDimensions, setNodeDimensions] = useState<ReadonlyMap<string, GraphNodeDimensions>>(
		() => new Map()
	)
	const selectedNodeIdsRef = useRef<ReadonlySet<string>>(new Set())
	const pointerPositionRef = useRef({ x: 0, y: 0 })

	useEffect(() => {
		selectedNodeIdsRef.current = new Set()
		setSelectedNodeIds(selectedNodeIdsRef.current)
		setSelectedEdgeIds(new Set())
		setFocusedNodeId(null)
		setPendingComponent(null)
		setConnectionTooltip(null)
		setConnectionDragging(false)
		setNodeDimensions(new Map())
	}, [activeGraphId])

	useEffect(() => {
		const updatePointerPosition = (event: PointerEvent) => {
			pointerPositionRef.current = { x: event.clientX, y: event.clientY }
		}
		window.addEventListener('pointermove', updatePointerPosition)
		return () => window.removeEventListener('pointermove', updatePointerPosition)
	}, [])

	useEffect(() => {
		const request = viewportSnapshot.graphNodeFocusRequest
		if (!request || request.graphId !== activeGraphId || !model.getNode(request.nodeId)) return
		const next = new Set([request.nodeId])
		selectedNodeIdsRef.current = next
		setSelectedNodeIds(next)
		setSelectedEdgeIds(new Set())
		setFocusedNodeId(request.nodeId)
		viewportEditor.controller.acknowledgeGraphNodeFocus()
	}, [activeGraphId, model, viewportEditor, viewportSnapshot.graphNodeFocusRequest])

	useEffect(() => {
		if (!focusedNodeId) return
		const timeout = window.setTimeout(() => setFocusedNodeId(null), 1_400)
		return () => window.clearTimeout(timeout)
	}, [focusedNodeId])

	const modelNodes = useMemo<ParametricFlowNode[]>(() => {
		const graphNodes = model.getNodes()
		const repeatZones = graphNodes.flatMap((node): RepeatZone[] => {
			if (!(node instanceof RepeatOutputGraphNode)) return []
			const repeatInput = model.getNode(node.getRepeatInputId())
			return repeatInput instanceof RepeatInputGraphNode ? [new RepeatZone(repeatInput, node)] : []
		})
		const nodes = graphNodes.map((node) => ({
			id: node.id,
			type:
				node.type === 'group'
					? 'parametricGroup'
					: node.type === 'graphOutput'
						? 'parametricOutput'
						: node.type === 'input'
							? 'parametricInput'
							: node.type,
			position: node.getPosition(),
			data: {},
			selected: selectedNodeIds.has(node.id),
			className:
				[
					focusedNodeId === node.id ? 'graph-node-focus-pulse' : '',
					repeatZones.some((zone) => zone.contains(node)) ? 'repeat-zone-member' : '',
				]
					.filter(Boolean)
					.join(' ') || undefined,
			deletable: model.isNodeRemovable(node.id),
		})) satisfies ParametricFlowNode[]
		const repeatZoneRegions = repeatZones.map((zone): ParametricFlowNode => {
			const bounds = zone.getBounds(graphNodes, nodeDimensions)
			return {
				id: `repeat-zone-region:${zone.output.id}`,
				type: 'repeatZoneRegion',
				position: { x: bounds.x, y: bounds.y },
				data: {
					width: bounds.width,
					height: bounds.height,
				},
				draggable: false,
				selectable: false,
				deletable: false,
				connectable: false,
				focusable: false,
				className: 'pointer-events-none',
				zIndex: -1,
			}
		})
		return [...nodes, ...repeatZoneRegions]
	}, [focusedNodeId, model, nodeDimensions, revision, selectedNodeIds])
	const [nodes, setNodes] = useState(modelNodes)

	useEffect(() => setNodes(modelNodes), [modelNodes])

	const edges = useMemo<Edge[]>(
		() =>
			model.getEdges().map((edge) => ({
				id: edge.id,
				source: edge.sourceNodeId,
				target: edge.targetNodeId,
				sourceHandle: edge.sourcePort,
				targetHandle: edge.targetPort,
				selected: selectedEdgeIds.has(edge.id),
				label: edge.component,
				labelStyle: {
					fill: edge.component ? AXIS_COLORS[edge.component] : undefined,
					fontSize: 10,
					fontWeight: 600,
				},
				labelBgStyle: { fill: 'var(--background)' },
				labelBgPadding: [4, 2],
				labelBgBorderRadius: 4,
			})),
		[model, revision, selectedEdgeIds]
	)

	const selectedEdges = useMemo(() => edges.filter((edge) => selectedEdgeIds.has(edge.id)), [edges, selectedEdgeIds])

	const onEdgeMouseEnter = useCallback<EdgeMouseHandler>(
		(event, flowEdge) => {
			if (connectionDragging) return
			const edge = model.getEdges().find((candidate) => candidate.id === flowEdge.id)
			const sourceNode = edge ? model.getNode(edge.sourceNodeId) : undefined
			const targetNode = edge ? model.getNode(edge.targetNodeId) : undefined
			const sourcePort = edge?.sourcePort ?? undefined
			const targetPort = edge?.targetPort ?? undefined
			const sourceValueType =
				sourceNode && sourcePort ? model.getOutputPortValueType(sourceNode.id, sourcePort) : undefined
			const targetValueType =
				targetNode && targetPort ? model.getInputPortValueType(targetNode.id, targetPort) : undefined
			if (
				!edge ||
				!sourceNode ||
				!targetNode ||
				!sourcePort ||
				!targetPort ||
				!sourceValueType ||
				!targetValueType
			) {
				throw new Error(
					`Cannot show connection tooltip for edge "${flowEdge.id}" in graph "${activeGraphId}": ` +
						`edge=${JSON.stringify(edge)}, sourceNode=${JSON.stringify(sourceNode?.id)}, ` +
						`targetNode=${JSON.stringify(targetNode?.id)}, sourcePort=${JSON.stringify(sourcePort)}, ` +
						`targetPort=${JSON.stringify(targetPort)}, sourceValueType=${JSON.stringify(sourceValueType)}, ` +
						`targetValueType=${JSON.stringify(targetValueType)}.`
				)
			}
			setConnectionTooltip({
				edgeId: edge.id,
				position: { x: event.clientX, y: event.clientY },
				source: `${sourceNode.getName()} (${model.getNodeTypeLabel(sourceNode.id)}, ${sourceNode.id})`,
				sourcePort,
				sourceValueType,
				target: `${targetNode.getName()} (${model.getNodeTypeLabel(targetNode.id)}, ${targetNode.id})`,
				targetPort,
				targetValueType,
				component: edge.component,
			})
		},
		[activeGraphId, connectionDragging, model]
	)

	const onEdgeMouseLeave = useCallback<EdgeMouseHandler>(() => {
		setConnectionTooltip(null)
	}, [])

	const onNodesChange = useCallback(
		(changes: NodeChange<ParametricFlowNode>[]) => {
			setNodes((current) => applyNodeChanges(changes, current))
			setNodeDimensions((current) => {
				let next: Map<string, GraphNodeDimensions> | undefined
				for (const change of changes) {
					if (
						change.type !== 'dimensions'
						|| typeof change.dimensions?.width !== 'number'
						|| typeof change.dimensions.height !== 'number'
					) continue
					const dimensions = { width: change.dimensions.width, height: change.dimensions.height }
					const previous = current.get(change.id)
					if (previous?.width === dimensions.width && previous.height === dimensions.height) continue
					if (!next) next = new Map(current)
					next.set(change.id, dimensions)
				}
				return next ?? current
			})
			const nextSelectedNodeIds = new Set(selectedNodeIdsRef.current)
			const finalPositions = new Map<string, NodePositionUpdate>()
			let selectionChanged = false
			for (const change of changes) {
				if (change.type === 'position' && change.position) {
					if (change.dragging !== true) {
						finalPositions.set(change.id, { nodeId: change.id, position: change.position })
					}
				} else if (change.type === 'select') {
					if (change.selected && !nextSelectedNodeIds.has(change.id)) {
						nextSelectedNodeIds.add(change.id)
						selectionChanged = true
					} else if (!change.selected && nextSelectedNodeIds.delete(change.id)) {
						selectionChanged = true
					}
				}
			}
			controller.setNodePositions([...finalPositions.values()])
			if (!selectionChanged) return
			selectedNodeIdsRef.current = nextSelectedNodeIds
			setSelectedNodeIds(nextSelectedNodeIds)
		},
		[controller]
	)

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		for (const change of changes) {
			if (change.type === 'select') {
				setSelectedEdgeIds((current) => {
					const next = new Set(current)
					if (change.selected) next.add(change.id)
					else next.delete(change.id)
					return next
				})
			}
		}
	}, [])

	const onDelete = useCallback<OnDelete<ParametricFlowNode, Edge>>(
		({ nodes: deletedNodes, edges: deletedEdges }) => {
			controller.removeGraphElements(
				deletedNodes.map((node) => node.id),
				deletedEdges.map((edge) => edge.id)
			)
		},
		[controller]
	)

	const onConnect = useCallback(
		(connection: Connection) => {
			if (
				connection.sourceHandle &&
				connection.targetHandle &&
				controller.requiresVectorComponent(
					connection.source,
					connection.target,
					connection.sourceHandle,
					connection.targetHandle
				)
			) {
				setPendingComponent({
					sourceNodeId: connection.source,
					targetNodeId: connection.target,
					sourcePort: connection.sourceHandle,
					targetPort: connection.targetHandle,
					position: pointerPositionRef.current,
				})
				return
			}
			controller.connect(connection.source, connection.target, connection.sourceHandle, connection.targetHandle)
		},
		[controller]
	)

	const componentSelector = useMemo<VectorComponentSelectorBinding | null>(() => {
		if (!pendingComponent) return null
		return {
			position: pendingComponent.position,
			select: (component) => {
				controller.connect(
					pendingComponent.sourceNodeId,
					pendingComponent.targetNodeId,
					pendingComponent.sourcePort,
					pendingComponent.targetPort,
					component
				)
				setPendingComponent(null)
			},
			cancel: () => setPendingComponent(null),
		}
	}, [controller, pendingComponent])

	const onInit = useCallback((_instance: ReactFlowInstance<ParametricFlowNode, Edge>) => {}, [])

	const onConnectStart = useCallback<OnConnectStart>(() => {
		setConnectionDragging(true)
		setConnectionTooltip(null)
	}, [])

	const onConnectEnd = useCallback(() => {
		setConnectionDragging(false)
	}, [])

	const isValidConnection = useCallback(
		(connection: Connection | Edge) => {
			if (!connection.source || !connection.target) return false
			return controller.canConnect(
				connection.source,
				connection.target,
				connection.sourceHandle ?? null,
				connection.targetHandle ?? null
			)
		},
		[controller]
	)

	return {
		nodes,
		edges,
		selectedEdges,
		onNodesChange,
		onEdgesChange,
		onDelete,
		onConnect,
		onConnectStart,
		onConnectEnd,
		onInit,
		isValidConnection,
		componentSelector,
		connectionTooltip,
		onEdgeMouseEnter,
		onEdgeMouseLeave,
	}
}
