import defaultGraph from '@/parametric/defaultGraph.json'
import { GraphController } from '@/parametric/controller/GraphController'
import type { GraphEditorServices } from '@/parametric/controller/GraphEditorContext'
import { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import { deserializeGraph } from '@/parametric/model/GraphSerialization'
import { defaultNodeRegistry } from '@/parametric/nodes/defaultNodeRegistry'
import { meshRepository } from '@/parametric/three/MeshRepository'

export function createGraphEditorServices(document: unknown): GraphEditorServices {
	const controller = new GraphController(
		deserializeGraph(document, defaultNodeRegistry),
		defaultNodeRegistry,
		meshRepository
	)
	return {
		controller,
		evaluator: new GraphEvaluator(defaultNodeRegistry, meshRepository),
	}
}

export function createDefaultGraphController(): GraphController {
	return createGraphEditorServices(defaultGraph).controller
}

export const defaultGraphController = createDefaultGraphController()

export const defaultGraphEditorServices = createGraphEditorServices(defaultGraph)
