import type { GraphNode, GraphValueType } from '@/parametric/model/GraphNode'
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
export type NumberValue = GraphValue<number> & { valueType: 'number' }
export type PrimitiveArrayValue = GraphValue<Array<number | boolean>> & { valueType: 'primitiveArray' }
export type Vector3GraphValue = GraphValue<Vector3Snapshot> & { valueType: 'vector3' }
export type EnumValue = GraphValue<number> & { valueType: 'enum' }
export type MaterialInstanceValue = GraphValue<MaterialInstance> & { valueType: 'materialInstance' }
export type ColorValue = GraphValue<string> & { valueType: 'color' }
export type BooleanValue = GraphValue<boolean> & { valueType: 'boolean' }

export interface NodeEvaluationContext {
	resolveInput(node: GraphNode, portId: string): GraphValue | undefined
	resolveInputs(node: GraphNode, portId: string): GraphValue[]
	resolveGraphInput(inputId: string): GraphValue | undefined
	getMeshMetadata(meshId: string): Record<string, unknown> | undefined
	getNodeInstanceReference(nodeId: string): SceneNodeInstanceReference
	getRepeatIteration(repeatInputId: string): number | undefined
}

export type EvaluatedNodeOutputs = Map<string, GraphValue>
