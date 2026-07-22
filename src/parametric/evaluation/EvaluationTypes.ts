import type { Matrix4 } from 'three'
import type { GraphNode, GraphValueType } from '@/parametric/model/GraphNode'
import type { MeshBounds } from '@/parametric/model/MeshCatalog'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface EvaluatedInstance {
	instanceId: string
	meshId: string
	size: Vector3Snapshot
	matrix: Matrix4
	material?: EvaluatedMaterial
	assetSource?: EvaluatedAssetSource
}

export interface EvaluatedAssetSource {
	graphId: string
	nodeId: string
}

export interface EvaluatedMaterial {
	type: 'standard'
	color: string
}

export interface GraphValue<T = unknown> {
	valueType: GraphValueType
	value: T
}

export type GeometryValue = GraphValue<EvaluatedInstance[]> & { valueType: 'geometry' }
export type NumberValue = GraphValue<number> & { valueType: 'number' }
export type EnumValue = GraphValue<string> & { valueType: 'enum' }
export type ColorValue = GraphValue<string> & { valueType: 'color' }

export interface NodeEvaluationContext {
	graphId: string
	resolveInput(node: GraphNode, portId: string): GraphValue | undefined
	getMeshBounds(meshId: string): MeshBounds | undefined
}

export type EvaluatedNodeOutputs = Map<string, GraphValue>
