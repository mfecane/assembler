export class GraphEdge {
	public constructor(
		public readonly id: string,
		public readonly sourceNodeId: string,
		public readonly targetNodeId: string,
		public readonly sourcePort: string | null = null,
		public readonly targetPort: string | null = null
	) {}
}
