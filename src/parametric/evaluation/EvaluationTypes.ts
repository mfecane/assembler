import type { GraphNode, GraphValueType } from '@/parametric/model/GraphNode'
import type { MeshBounds } from '@/parametric/model/MeshCatalog'
import type {
	SceneMetadata,
	SceneNodeInstanceReference,
} from '@/parametric/evaluation/SceneMetadata'

export interface GraphValue<T = unknown> {
	valueType: GraphValueType
	value: T
}

export type GeometryValue = GraphValue<SceneMetadata> & { valueType: 'geometry' }
export type NumberValue = GraphValue<number> & { valueType: 'number' }
export type EnumValue = GraphValue<string> & { valueType: 'enum' }
export type ColorValue = GraphValue<string> & { valueType: 'color' }

export interface NodeEvaluationContext {
	resolveInput(node: GraphNode, portId: string): GraphValue | undefined
	getMeshBounds(meshId: string): MeshBounds | undefined
	getNodeInstanceReference(nodeId: string): SceneNodeInstanceReference
}

export type EvaluatedNodeOutputs = Map<string, GraphValue>
