import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection, Edge, EdgeChange, Node, NodeChange } from '@xyflow/react'
import {
	useGraphController,
	useViewportBridgeSnapshot,
	useViewportEditor,
} from '@/parametric/controller/GraphEditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

interface FlowNodeData extends Record<string, unknown> {}

type ParametricFlowNodeType = string

export type ParametricFlowNode = Node<FlowNodeData, ParametricFlowNodeType>

export interface FlowGraphBinding {
	nodes: ParametricFlowNode[]
	edges: Edge[]
	selectedEdges: Edge[]
	onNodesChange: (changes: NodeChange<ParametricFlowNode>[]) => void
	onEdgesChange: (changes: EdgeChange[]) => void
	onConnect: (connection: Connection) => void
	isValidConnection: (connection: Connection | Edge) => boolean
}

export function useFlowGraph(): FlowGraphBinding {
	const controller = useGraphController()
	const viewportEditor = useViewportEditor()
	const viewportSnapshot = useViewportBridgeSnapshot()
	const { activeGraphId, model, revision } = useGraphSnapshot()
	const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(() => new Set())
	const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(() => new Set())
	const selectedNodeIdsRef = useRef<ReadonlySet<string>>(new Set())

	useEffect(() => {
		selectedNodeIdsRef.current = new Set()
		setSelectedNodeIds(selectedNodeIdsRef.current)
		setSelectedEdgeIds(new Set())
	}, [activeGraphId])

	useEffect(() => {
		const request = viewportSnapshot.graphNodeFocusRequest
		if (!request || request.graphId !== activeGraphId || !model.getNode(request.nodeId)) return
		const next = new Set([request.nodeId])
		selectedNodeIdsRef.current = next
		setSelectedNodeIds(next)
		setSelectedEdgeIds(new Set())
		viewportEditor.controller.acknowledgeGraphNodeFocus()
	}, [
		activeGraphId,
		model,
		viewportEditor,
		viewportSnapshot.graphNodeFocusRequest,
	])

	const nodes = useMemo<ParametricFlowNode[]>(
		() =>
				model.getNodes().map((node) => ({
					id: node.id,
					type:
						node.type === 'group'
							? 'parametricGroup'
							: node.type === 'graphOutput'
								? 'parametricOutput'
								: node.type,
				position: node.getPosition(),
				data: {},
				selected: selectedNodeIds.has(node.id),
				deletable: model.isNodeRemovable(node.id),
			})),
		[model, revision, selectedNodeIds]
	)

	const edges = useMemo<Edge[]>(
		() =>
			model.getEdges().map((edge) => ({
				id: edge.id,
				source: edge.sourceNodeId,
				target: edge.targetNodeId,
				sourceHandle: edge.sourcePort,
				targetHandle: edge.targetPort,
				selected: selectedEdgeIds.has(edge.id),
			})),
		[model, revision, selectedEdgeIds]
	)

	const selectedEdges = useMemo(
		() => edges.filter((edge) => selectedEdgeIds.has(edge.id)),
		[edges, selectedEdgeIds]
	)

	const onNodesChange = useCallback((changes: NodeChange<ParametricFlowNode>[]) => {
		const nextSelectedNodeIds = new Set(selectedNodeIdsRef.current)
		let selectionChanged = false
		for (const change of changes) {
			if (change.type === 'position' && change.position) {
				controller.setNodePosition(change.id, change.position)
			} else if (change.type === 'remove') {
				controller.removeNode(change.id)
			} else if (change.type === 'select') {
				if (change.selected && !nextSelectedNodeIds.has(change.id)) {
					nextSelectedNodeIds.add(change.id)
					selectionChanged = true
				} else if (!change.selected && nextSelectedNodeIds.delete(change.id)) {
					selectionChanged = true
				}
			}
		}
		if (!selectionChanged) return
		selectedNodeIdsRef.current = nextSelectedNodeIds
		setSelectedNodeIds(nextSelectedNodeIds)
	}, [controller])

	const onEdgesChange = useCallback((changes: EdgeChange[]) => {
		for (const change of changes) {
			if (change.type === 'remove') {
				controller.removeEdge(change.id)
			} else if (change.type === 'select') {
				setSelectedEdgeIds((current) => {
					const next = new Set(current)
					if (change.selected) next.add(change.id)
					else next.delete(change.id)
					return next
				})
			}
		}
	}, [controller])

	const onConnect = useCallback((connection: Connection) => {
		controller.connect(
			connection.source,
			connection.target,
			connection.sourceHandle,
			connection.targetHandle
		)
	}, [controller])

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

	return { nodes, edges, selectedEdges, onNodesChange, onEdgesChange, onConnect, isValidConnection }
}
