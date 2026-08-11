import type {
	GraphDefinition,
	GraphDocumentModel,
} from '@/parametric/model/GraphDocumentModel'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'

export interface GraphDependencyTreeItem {
	graph: GraphDefinition
	root: boolean
	children: GraphDependencyTreeItem[]
}

export interface GraphDependencyForest {
	rootTrees: GraphDependencyTreeItem[]
	unusedTrees: GraphDependencyTreeItem[]
}

export function buildGraphDependencyForest(document: GraphDocumentModel): GraphDependencyForest {
	const dependencies = new Map<string, string[]>()
	const referencedGraphIds = new Set<string>()

	for (const graph of document.getGraphs()) {
		const childGraphIds = new Set(
			graph.model.getNodes()
				.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
				.map((node) => node.getGraphId())
		)
		dependencies.set(graph.id, [...childGraphIds])
		for (const childGraphId of childGraphIds) referencedGraphIds.add(childGraphId)
	}

	const buildTree = (
		graph: GraphDefinition,
		root: boolean,
		path: ReadonlySet<string>
	): GraphDependencyTreeItem => {
		if (path.has(graph.id)) {
			throw new Error(
				`Graph selector found recursive dependency at graph "${graph.id}" in path `
				+ JSON.stringify([...path, graph.id])
			)
		}
		const nextPath = new Set(path).add(graph.id)
		return {
			graph,
			root,
			children: (dependencies.get(graph.id) ?? []).map((graphId) =>
				buildTree(document.requireGraph(graphId), false, nextPath)
			),
		}
	}

	const rootGraphs = document.getRootGraphs().map((root) =>
		document.requireGraph(root.getGraphId())
	)
	const unusedGraphs = document.getGraphs().filter((graph) =>
		!document.isRootGraph(graph.id) && !referencedGraphIds.has(graph.id)
	)

	return {
		rootTrees: rootGraphs.map((graph) => buildTree(graph, true, new Set())),
		unusedTrees: unusedGraphs.map((graph) => buildTree(graph, false, new Set())),
	}
}
