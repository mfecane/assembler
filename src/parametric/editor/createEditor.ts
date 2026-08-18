import { Client } from '@/cosntants'
import maxshelfDefaultGraph from '@/data/maxshelf/defaultGraph.json'
import kitchenDefaultGraph from '@/data/kitchen/defaultGraph.json'
import { Editor } from '@/parametric/editor/Editor'
import { deserializeGraph } from '@/parametric/model/GraphSerialization'
import { defaultNodeRegistry } from '@/parametric/nodes/defaultNodeRegistry'
import { meshRepository } from '@/parametric/three/MeshRepository'

export function createEditor(document: unknown): Editor {
	const graph = deserializeGraph(document, defaultNodeRegistry)
	return new Editor(
		graph,
		defaultNodeRegistry,
		meshRepository.forClient(graph.getClient())
	)
}

const defaultGraphs: Record<Client, unknown> = {
	[Client.MAXSHELF]: maxshelfDefaultGraph,
	[Client.KITCHEN]: kitchenDefaultGraph,
}

export function createDefaultEditor(client: Client): Editor {
	return createEditor(defaultGraphs[client])
}
