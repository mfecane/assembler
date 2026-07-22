import { useCallback } from 'react'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'
import type { GraphPoint } from '@/parametric/model/GraphNode'
import type { GraphInputDefinition } from '@/parametric/model/GraphDocumentModel'
import type { CreatableNodeDefinition } from '@/parametric/model/NodeDefinition'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export interface GraphActions {
	nodeDefinitions: CreatableNodeDefinition[]
	addNode: (type: string, position: GraphPoint, selectedEdgeId?: string) => void
	addGraphInput: (valueType: GraphInputDefinition['valueType'], position: GraphPoint) => void
	addGraphInstance: (graphId: string, position: GraphPoint, selectedEdgeId?: string) => void
	graphDefinitions: Array<{ id: string; label: string }>
	clearGraph: () => void
	removeNode: (nodeId: string) => void
	removeEdge: (edgeId: string) => void
}

export function useGraphActions(): GraphActions {
	const controller = useGraphController()
	const { document, activeGraphId } = useGraphSnapshot()
	const addNode = useCallback(
		(type: string, position: GraphPoint, selectedEdgeId?: string) =>
			controller.addNode(type, position, selectedEdgeId),
		[controller]
	)
	const clearGraph = useCallback(() => controller.clearGraph(), [controller])
	const addGraphInput = useCallback(
		(valueType: GraphInputDefinition['valueType'], position: GraphPoint) =>
			controller.addGraphInput(valueType, position),
		[controller]
	)
	const addGraphInstance = useCallback(
		(graphId: string, position: GraphPoint, selectedEdgeId?: string) =>
			controller.addGraphInstance(graphId, position, selectedEdgeId),
		[controller]
	)
	const removeNode = useCallback((nodeId: string) => controller.removeNode(nodeId), [controller])
	const removeEdge = useCallback((edgeId: string) => controller.removeEdge(edgeId), [controller])

	return {
		nodeDefinitions: controller.getCreatableNodeDefinitions(),
		addNode,
		addGraphInput,
		addGraphInstance,
		graphDefinitions: document.getGraphs()
			.filter((graph) => graph.id !== activeGraphId)
			.map((graph) => ({ id: graph.id, label: graph.label })),
		clearGraph,
		removeNode,
		removeEdge,
	}
}
