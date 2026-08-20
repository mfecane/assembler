import type { GraphNode, GraphValueType } from '@/parametric/model/GraphNode'
import type { MeshBounds } from '@/parametric/model/MeshCatalog'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import type { MaterialInstance } from '@/parametric/model/MaterialInstance'
import type {
	SceneMetadata,
	SceneNodeInstanceReference,
} from '@/parametric/evaluation/SceneMetadata'

export interface GraphValue<T = unknown> {
	valueType: GraphValueType
	value: T
}

export type GeometryValue = GraphValue<SceneMetadata> & { valueType: 'geometry' }
export type MeshArrayValue = GraphValue<SceneMetadata[]> & { valueType: 'meshArray' }
export type NumberValue = GraphValue<number> & { valueType: 'number' }
export type NumberArrayValue = GraphValue<number[]> & { valueType: 'numberArray' }
export type Vector3GraphValue = GraphValue<Vector3Snapshot> & { valueType: 'vector3' }
export type EnumValue = GraphValue<number> & { valueType: 'enum' }
export type MaterialInstanceValue = GraphValue<MaterialInstance> & { valueType: 'materialInstance' }
export type ColorValue = GraphValue<string> & { valueType: 'color' }
export type BooleanValue = GraphValue<boolean> & { valueType: 'boolean' }

export interface NodeEvaluationContext {
	resolveInput(node: GraphNode, portId: string): GraphValue | undefined
	resolveInputs(node: GraphNode, portId: string): GraphValue[]
	resolveGraphInput(inputId: string): GraphValue | undefined
	getMeshBounds(meshId: string): MeshBounds | undefined
	getMeshMetadata(meshId: string): Record<string, unknown> | undefined
	getNodeInstanceReference(nodeId: string): SceneNodeInstanceReference
}

export type EvaluatedNodeOutputs = Map<string, GraphValue>
