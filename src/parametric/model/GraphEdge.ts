import type { GraphValueType } from '@/parametric/model/GraphNode'

export type VectorComponent = 'x' | 'y' | 'z'

export function supportsVectorComponentInterop(
	sourceType: GraphValueType,
	targetType: GraphValueType
): boolean {
	return (sourceType === 'vector3' && targetType === 'number')
		|| (sourceType === 'number' && targetType === 'vector3')
}

export class GraphEdge {
	public constructor(
		public readonly id: string,
		public readonly sourceNodeId: string,
		public readonly targetNodeId: string,
		public readonly sourcePort: string | null = null,
		public readonly targetPort: string | null = null,
		public readonly component?: VectorComponent
	) {
		if (component !== undefined && !['x', 'y', 'z'].includes(component)) {
			throw new Error(
				`Graph edge "${id}" from "${sourceNodeId}.${sourcePort}" to `
				+ `"${targetNodeId}.${targetPort}" has invalid Vector3 component `
				+ `${JSON.stringify(component)}. Expected "x", "y", or "z".`
			)
		}
	}
}
