import defaultGraph from '@/data/defaultGraph.json'
import { Editor } from '@/parametric/editor/Editor'
import { deserializeGraph } from '@/parametric/model/GraphSerialization'
import { defaultNodeRegistry } from '@/parametric/nodes/defaultNodeRegistry'
import { meshRepository } from '@/parametric/three/MeshRepository'

export function createEditor(document: unknown): Editor {
	return new Editor(
		deserializeGraph(document, defaultNodeRegistry),
		defaultNodeRegistry,
		meshRepository
	)
}

export function createDefaultEditor(): Editor {
	return createEditor(defaultGraph)
}
