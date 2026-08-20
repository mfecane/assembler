import { Client } from '@/cosntants'
import defaultGraphTemplate from '../../../scripts/data/defaultGraph.json'
import { Editor } from '@/parametric/editor/Editor'
import { deserializeGraph, type GraphDocument } from '@/parametric/model/GraphSerialization'
import { defaultNodeRegistry } from '@/parametric/nodes/defaultNodeRegistry'
import { meshRepository } from '@/parametric/three/MeshRepository'
import { materialRepository } from '@/parametric/three/MaterialRepository'

export function createEditor(document: unknown): Editor {
	const graph = deserializeGraph(document, defaultNodeRegistry)
	return new Editor(
		graph,
		defaultNodeRegistry,
		meshRepository.forClient(graph.getClient()),
		materialRepository
	)
}

const defaultGraph = defaultGraphTemplate as Omit<GraphDocument, 'client'>

export function createDefaultGraph(client: Client): GraphDocument {
	return { client, ...defaultGraph }
}

export function createDefaultEditor(client: Client): Editor {
	return createEditor(createDefaultGraph(client))
}
