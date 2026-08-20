import { GraphEdge, supportsVectorComponentInterop } from '@/parametric/model/GraphEdge'
import type { GraphNode, GraphValueType } from '@/parametric/model/GraphNode'
import type { NodePortContext, NodeRegistry } from '@/parametric/model/NodeDefinition'

export interface GraphModelReader {
	getNodes(): GraphNode[]
	getNode(nodeId: string): GraphNode | undefined
	getNodeTypeLabel(nodeId: string): string | undefined
	getEdges(): GraphEdge[]
	getInputPortValueType(nodeId: string, portId: string): GraphValueType | undefined
	getOutputPortValueType(nodeId: string, portId: string): GraphValueType | undefined
	getInputOptions(nodeId: string, portId: string): string[]
	getFieldValue(nodeId: string, field: string): unknown
	isNodeRemovable(nodeId: string): boolean
}

export class GraphModel implements GraphModelReader {
	private readonly nodes = new Map<string, GraphNode>()
	private readonly edges = new Map<string, GraphEdge>()

	public constructor(
		private readonly nodeRegistry: NodeRegistry,
		nodes: GraphNode[] = [],
		edges: GraphEdge[] = [],
		private portContext?: NodePortContext
	) {
		for (const node of nodes) this.nodes.set(node.id, node)
		for (const edge of edges) this.connect(edge)
	}

	public getNodes(): GraphNode[] {
		return [...this.nodes.values()]
	}

	public getNode(nodeId: string): GraphNode | undefined {
		return this.nodes.get(nodeId)
	}

	public getNodeTypeLabel(nodeId: string): string | undefined {
		const node = this.nodes.get(nodeId)
		return node ? this.nodeRegistry.getLabel(node.type) : undefined
	}

	public getEdges(): GraphEdge[] {
		return [...this.edges.values()]
	}

	public getInputPortValueType(nodeId: string, portId: string): GraphValueType | undefined {
		const node = this.nodes.get(nodeId)
		return node
			? this.nodeRegistry.getInputPorts(node, this.portContext)
				.find((port) => port.id === portId)?.valueType
			: undefined
	}

	public getOutputPortValueType(nodeId: string, portId: string): GraphValueType | undefined {
		const node = this.nodes.get(nodeId)
		return node
			? this.nodeRegistry.getOutputPorts(node, this.portContext)
				.find((port) => port.id === portId)?.valueType
			: undefined
	}

	public setPortContext(context: NodePortContext): void {
		this.portContext = context
	}

	public getInputOptions(nodeId: string, portId: string): string[] {
		return this.resolveInputOptions(nodeId, portId, new Set())
	}

	private resolveInputOptions(
		nodeId: string,
		portId: string,
		visitedPorts: Set<string>
	): string[] {
		const portKey = `${nodeId}:${portId}`
		if (visitedPorts.has(portKey)) return []
		visitedPorts.add(portKey)
		const edge = [...this.edges.values()].find(
			(candidate) => candidate.targetNodeId === nodeId && candidate.targetPort === portId
		)
		if (!edge?.sourcePort) return []
		const sourceNode = this.nodes.get(edge.sourceNodeId)
		if (!sourceNode) return []
		if (sourceNode.type === 'pin' && edge.sourcePort === 'value') {
			return this.resolveInputOptions(sourceNode.id, 'value', visitedPorts)
		}
		return [
			...(this.nodeRegistry.getOutputOptions(sourceNode, edge.sourcePort, this.portContext) ?? []),
		]
	}

	public getFieldValue(nodeId: string, field: string): unknown {
		const node = this.nodes.get(nodeId)
		return node ? this.nodeRegistry.getFieldValue(node, field) : undefined
	}

	public setFieldValue(nodeId: string, field: string, value: unknown): boolean {
		const node = this.nodes.get(nodeId)
		return node ? this.nodeRegistry.setFieldValue(node, field, value) : false
	}

	public addNode(node: GraphNode): void {
		if (this.nodes.has(node.id) || this.nodeRegistry.isOutput(node)) return
		this.nodes.set(node.id, node)
	}

	public removeNode(nodeId: string): void {
		const node = this.nodes.get(nodeId)
		if (!node || this.nodeRegistry.isOutput(node)) return
		this.nodes.delete(nodeId)
		for (const edge of this.edges.values()) {
			if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
				this.edges.delete(edge.id)
			}
		}
	}

	public clearExceptOutput(): void {
		for (const [nodeId, node] of this.nodes) {
			if (!this.nodeRegistry.isOutput(node)) this.nodes.delete(nodeId)
		}
		this.edges.clear()
	}

	public connect(edge: GraphEdge): void {
		const normalizedEdge = this.normalizeEdge(edge)
		if (!normalizedEdge || !this.canConnect(normalizedEdge)) return
		const targetNode = this.nodes.get(normalizedEdge.targetNodeId)

		for (const existing of this.edges.values()) {
			const targetsSamePort =
				existing.targetNodeId === normalizedEdge.targetNodeId && existing.targetPort === normalizedEdge.targetPort
			if (
				targetsSamePort
				&& targetNode
				&& !this.nodeRegistry.isMultiInput(
					targetNode,
					normalizedEdge.targetPort ?? '',
					this.portContext
				)
			) this.edges.delete(existing.id)
		}
		this.edges.set(normalizedEdge.id, normalizedEdge)
	}

	public canConnect(edge: GraphEdge): boolean {
		const normalizedEdge = this.normalizeEdge(edge)
		if (!normalizedEdge) return false
		const sourceNode = this.nodes.get(normalizedEdge.sourceNodeId)
		const targetNode = this.nodes.get(normalizedEdge.targetNodeId)
		if (!sourceNode || !targetNode || this.nodeRegistry.isOutput(sourceNode)) return false

		const sourcePort = this.nodeRegistry.getOutputPorts(sourceNode, this.portContext)
			.find((port) => port.id === normalizedEdge.sourcePort)
		const targetPort = this.nodeRegistry.getInputPorts(targetNode, this.portContext)
			.find((port) => port.id === normalizedEdge.targetPort)
		if (!sourcePort || !targetPort) return false
		return normalizedEdge.component
			? supportsVectorComponentInterop(sourcePort.valueType, targetPort.valueType)
			: this.nodeRegistry.canConnect(sourcePort.valueType, targetPort.valueType)
	}

	public removeEdge(edgeId: string): void {
		const edge = this.edges.get(edgeId)
		if (!edge) return
		this.edges.delete(edgeId)
	}

	public getOutputNode(): GraphNode | undefined {
		return this.getNodes().find((node) => this.nodeRegistry.isOutput(node))
	}

	public isNodeRemovable(nodeId: string): boolean {
		const node = this.nodes.get(nodeId)
		return Boolean(node && !this.nodeRegistry.isOutput(node))
	}

	private normalizeEdge(edge: GraphEdge): GraphEdge | undefined {
		const sourceNode = this.nodes.get(edge.sourceNodeId)
		const targetNode = this.nodes.get(edge.targetNodeId)
		if (!sourceNode || !targetNode) return undefined
		const sourcePort = edge.sourcePort
			?? this.nodeRegistry.getOutputPorts(sourceNode, this.portContext)[0]?.id
		const targetPort = edge.targetPort
			?? this.nodeRegistry.getInputPorts(targetNode, this.portContext)[0]?.id
		if (!sourcePort || !targetPort) return undefined
		return new GraphEdge(
			edge.id,
			edge.sourceNodeId,
			edge.targetNodeId,
			sourcePort,
			targetPort,
			edge.component
		)
	}

}
