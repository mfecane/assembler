import { GraphEdge } from '@/parametric/model/GraphEdge'
import {
	type ConfigurationPanelControl,
	GraphDocumentModel,
	type GraphInputDefinition,
	type GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import { GraphModel } from '@/parametric/model/GraphModel'
import {
	GraphInstanceGraphNode,
	GraphInputGraphNode,
	MeshAssetGraphNode,
	OutputGraphNode,
	type GraphNode,
	type GraphPoint,
} from '@/parametric/model/GraphNode'
import { createAssetMetadataDocument, type AssetMetadataDocument } from '@/parametric/model/AssetMetadataDocument'
import {
	deserializeGraph,
	serializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import type { CreatableNodeDefinition, NodeRegistry } from '@/parametric/model/NodeDefinition'

export interface GraphControllerSnapshot {
	revision: number
	documentRevision: number
	document: GraphDocumentModel
	activeGraphId: string
	model: GraphModel
}

type GraphListener = () => void

export class GraphController {
	private readonly listeners = new Set<GraphListener>()
	private revision = 0
	private documentRevision = 0
	private activeGraphId: string
	private snapshot: GraphControllerSnapshot

	public constructor(
		private document: GraphDocumentModel,
		private readonly nodeRegistry: NodeRegistry,
		private readonly meshCatalog: MeshCatalog
	) {
		this.activeGraphId = document.getEntryGraphId()
		this.snapshot = this.createSnapshot()
	}

	public readonly getSnapshot = (): GraphControllerSnapshot => this.snapshot

	public readonly subscribe = (listener: GraphListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public openGraph(graphId: string): void {
		if (!this.document.getGraph(graphId) || graphId === this.activeGraphId) return
		this.activeGraphId = graphId
		this.publish(false)
	}

	public setNodePosition(nodeId: string, position: GraphPoint): void {
		const node = this.activeModel.getNode(nodeId)
		if (!node) return
		node.setPosition(position)
		this.publish()
	}

	public addNode(type: string, position: GraphPoint, selectedEdgeId?: string): void {
		const id = this.createNodeId(type)
		const node = this.nodeRegistry.create(type, id, position, { meshCatalog: this.meshCatalog })
		if (!node) return
		if (selectedEdgeId && this.insertNodeOnEdge(node, selectedEdgeId)) {
			this.publish()
			return
		}
		this.activeModel.addNode(node)
		this.publish()
	}

	public addMeshAsset(meshId: string, position: GraphPoint): void {
		const mesh = this.meshCatalog.getMeshes().find(
			(candidate) => candidate.id === meshId && candidate.selectable
		)
		if (!mesh) {
			throw new Error(
				`Cannot add Mesh Asset node to graph "${this.activeGraphId}": ` +
				`mesh "${meshId}" is not registered as a selectable asset`
			)
		}
		const id = this.createNodeId('meshAsset')
		this.activeModel.addNode(new MeshAssetGraphNode(id, position, mesh.id))
		this.publish()
	}

	public addGraphInstance(
		graphId: string,
		position: GraphPoint,
		selectedEdgeId?: string
	): void {
		if (!this.document.getGraph(graphId) || graphId === this.activeGraphId) return
		if (this.wouldCreateReferenceCycle(graphId)) return
		const id = this.createNodeId('graphInstance')
		const node = new GraphInstanceGraphNode(id, position, graphId)
		if (selectedEdgeId && this.insertNodeOnEdge(node, selectedEdgeId)) {
			this.publish()
			return
		}
		this.activeModel.addNode(node)
		this.publish()
	}

	public addGraph(): void {
		const id = this.createGraphId()
		const model = new GraphModel(
			this.nodeRegistry,
			[new OutputGraphNode(`${id}-output`, { x: 500, y: 120 })]
		)
		this.document.addGraph({
			id,
			label: `Assembly ${this.document.getGraphs().length + 1}`,
			inputs: [],
			output: { id: 'geometry', label: 'Geometry', valueType: 'geometry' },
			model,
		})
		model.setPortContext({
			containingGraphId: id,
			getGraphInterface: (graphId) => this.document.getGraphInterface(graphId),
		})
		this.activeGraphId = id
		this.publish()
	}

	public renameGraph(graphId: string, label: string): void {
		if (this.document.renameGraph(graphId, label)) this.publish()
	}

	public removeGraph(graphId: string): void {
		if (!this.canRemoveGraph(graphId) || !this.document.removeGraph(graphId)) return
		if (this.activeGraphId === graphId) this.activeGraphId = this.document.getEntryGraphId()
		this.publish()
	}

	public canRemoveGraph(graphId: string): boolean {
		if (graphId === this.document.getEntryGraphId()) return false
		return !this.document.getGraphs().some((graph) =>
			graph.model.getNodes().some(
				(node) => node instanceof GraphInstanceGraphNode && node.getGraphId() === graphId
			)
		)
	}

	public addGraphInput(
		valueType: GraphInputDefinition['valueType'],
		position: GraphPoint
	): void {
		const graph = this.document.requireGraph(this.activeGraphId)
		const inputId = this.createInputId(valueType)
		const input = createInputDefinition(inputId, valueType)
		if (!this.document.addInput(graph.id, input)) return
		const boundaryId = this.createNodeId('graphInput')
		graph.model.addNode(new GraphInputGraphNode(boundaryId, position, inputId))
		this.publish()
	}

	public updateGraphInput(
		inputId: string,
		update: Partial<Omit<GraphInputDefinition, 'id' | 'valueType'>>
	): void {
		if (this.document.updateInput(this.activeGraphId, inputId, update)) this.publish()
	}

	public removeGraphInput(inputId: string): void {
		if (!this.removeGraphInputFromGraph(this.activeGraphId, inputId)) return
		this.publish()
	}

	private removeGraphInputFromGraph(graphId: string, inputId: string): boolean {
		const graph = this.document.requireGraph(graphId)
		const boundary = graph.model.getNodes().find(
			(node) => node instanceof GraphInputGraphNode && node.getInputId() === inputId
		)
		if (!this.document.removeInput(graph.id, inputId)) return false
		if (boundary) graph.model.removeNode(boundary.id)
		for (const containingGraph of this.document.getGraphs()) {
			const instanceIds = new Set(
				containingGraph.model.getNodes()
					.filter((node): node is GraphInstanceGraphNode =>
						node instanceof GraphInstanceGraphNode && node.getGraphId() === graph.id
					)
					.map((node) => node.id)
			)
			for (const edge of containingGraph.model.getEdges()) {
				if (instanceIds.has(edge.targetNodeId) && edge.targetPort === inputId) {
					containingGraph.model.removeEdge(edge.id)
				}
			}
		}
		return true
	}

	public getCreatableNodeDefinitions(): CreatableNodeDefinition[] {
		return this.nodeRegistry.getCreatableDefinitions()
	}

	public getSelectableMeshes(): MeshDescriptor[] {
		return this.meshCatalog
			.getMeshes()
			.filter((mesh) => mesh.selectable)
			.map((mesh) => ({ ...mesh }))
	}

	public createMeshPreviewGeometry(meshId: string) {
		return this.meshCatalog.createGeometry(meshId)
	}

	public removeNode(nodeId: string): void {
		const node = this.activeModel.getNode(nodeId)
		if (node instanceof GraphInputGraphNode) {
			this.removeGraphInput(node.getInputId())
			return
		}
		this.activeModel.removeNode(nodeId)
		this.publish()
	}

	public clearGraph(): void {
		const graph = this.document.requireGraph(this.activeGraphId)
		for (const input of [...graph.inputs]) {
			this.removeGraphInputFromGraph(graph.id, input.id)
		}
		this.activeModel.clearExceptOutput()
		this.publish()
	}

	public connect(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null
	): void {
		const id = this.createEdgeId(sourceNodeId, targetNodeId, sourcePort, targetPort)
		this.activeModel.connect(new GraphEdge(id, sourceNodeId, targetNodeId, sourcePort, targetPort))
		this.publish()
	}

	public canConnect(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null
	): boolean {
		return this.activeModel.canConnect(
			new GraphEdge('', sourceNodeId, targetNodeId, sourcePort, targetPort)
		)
	}

	public removeEdge(edgeId: string): void {
		this.activeModel.removeEdge(edgeId)
		this.publish()
	}

	public exportGraph(): GraphDocument {
		return serializeGraph(this.document, this.nodeRegistry)
	}

	public exportAssetMetadata(): AssetMetadataDocument {
		return createAssetMetadataDocument(this.meshCatalog)
	}

	public importGraph(value: unknown): void {
		this.document = deserializeGraph(value, this.nodeRegistry)
		this.activeGraphId = this.document.getEntryGraphId()
		this.publish()
	}

	public setNumericValue(nodeId: string, field: string, value: number): void {
		if (this.activeModel.setNumericValue(nodeId, field, value)) this.publish()
	}

	public updateNode<TNode extends GraphNode>(
		nodeId: string,
		expectedType: string,
		update: (node: TNode) => void
	): void {
		this.updateNodeInGraph(this.activeGraphId, nodeId, expectedType, update)
	}

	public updateNodeInGraph<TNode extends GraphNode>(
		graphId: string,
		nodeId: string,
		expectedType: string,
		update: (node: TNode) => void
	): void {
		const node = this.document.getGraph(graphId)?.model.getNode(nodeId)
		if (!node || node.type !== expectedType) return
		update(node as TNode)
		this.publish()
	}

	public setEntryInputValue(inputId: string, value: GraphInputValue): void {
		if (this.document.setEntryInputValue(inputId, value)) this.publish()
	}

	public setConfigurationControls(controls: ConfigurationPanelControl[]): void {
		this.document.setConfigurationControls(controls)
		this.publish()
	}

	private get activeModel(): GraphModel {
		return this.document.requireGraph(this.activeGraphId).model
	}

	private createSnapshot(): GraphControllerSnapshot {
		return {
			revision: this.revision,
			documentRevision: this.documentRevision,
			document: this.document,
			activeGraphId: this.activeGraphId,
			model: this.activeModel,
		}
	}

	private publish(documentChanged = true): void {
		this.revision += 1
		if (documentChanged) this.documentRevision += 1
		this.snapshot = this.createSnapshot()
		for (const listener of this.listeners) listener()
	}

	private createNodeId(type: string): string {
		let sequence = 1
		while (this.activeModel.getNode(`${type}-${sequence}`)) sequence += 1
		return `${type}-${sequence}`
	}

	private insertNodeOnEdge(node: GraphNode, edgeId: string): boolean {
		const edge = this.activeModel.getEdges().find((candidate) => candidate.id === edgeId)
		if (!edge?.sourcePort || !edge.targetPort) return false
		const sourceNode = this.activeModel.getNode(edge.sourceNodeId)
		const targetNode = this.activeModel.getNode(edge.targetNodeId)
		if (!sourceNode || !targetNode) return false

		const portContext = {
			containingGraphId: this.activeGraphId,
			getGraphInterface: (graphId: string) => this.document.getGraphInterface(graphId),
		}
		const sourcePort = this.nodeRegistry.getOutputPorts(sourceNode, portContext)
			.find((port) => port.id === edge.sourcePort)
		const targetPort = this.nodeRegistry.getInputPorts(targetNode, portContext)
			.find((port) => port.id === edge.targetPort)
		if (!sourcePort || !targetPort) return false

		const inputPort = this.nodeRegistry.getInputPorts(node, portContext)
			.find((port) => this.nodeRegistry.canConnect(sourcePort.valueType, port.valueType))
		const outputPort = this.nodeRegistry.getOutputPorts(node, portContext)
			.find((port) => this.nodeRegistry.canConnect(port.valueType, targetPort.valueType))
		if (!inputPort || !outputPort) return false

		const sourcePosition = sourceNode.getPosition()
		const targetPosition = targetNode.getPosition()
		node.setPosition({
			x: (sourcePosition.x + targetPosition.x) / 2,
			y: (sourcePosition.y + targetPosition.y) / 2,
		})
		this.activeModel.addNode(node)
		this.activeModel.connect(new GraphEdge(
			this.createEdgeId(edge.sourceNodeId, node.id, edge.sourcePort, inputPort.id),
			edge.sourceNodeId,
			node.id,
			edge.sourcePort,
			inputPort.id
		))
		this.activeModel.removeEdge(edge.id)
		this.activeModel.connect(new GraphEdge(
			this.createEdgeId(node.id, edge.targetNodeId, outputPort.id, edge.targetPort),
			node.id,
			edge.targetNodeId,
			outputPort.id,
			edge.targetPort
		))
		return true
	}

	private createEdgeId(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null
	): string {
		return `${sourceNodeId}:${sourcePort ?? 'output'}->${targetNodeId}:${targetPort ?? 'input'}`
	}

	private createGraphId(): string {
		let sequence = 1
		while (this.document.getGraph(`graph-${sequence}`)) sequence += 1
		return `graph-${sequence}`
	}

	private createInputId(valueType: string): string {
		const graph = this.document.requireGraph(this.activeGraphId)
		let sequence = 1
		while (graph.inputs.some((input) => input.id === `${valueType}-${sequence}`)) sequence += 1
		return `${valueType}-${sequence}`
	}

	private wouldCreateReferenceCycle(targetGraphId: string): boolean {
		const visited = new Set<string>()
		const reachesActiveGraph = (graphId: string): boolean => {
			if (graphId === this.activeGraphId) return true
			if (visited.has(graphId)) return false
			visited.add(graphId)
			const graph = this.document.getGraph(graphId)
			if (!graph) return false
			return graph.model.getNodes()
				.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
				.some((node) => reachesActiveGraph(node.getGraphId()))
		}
		return reachesActiveGraph(targetGraphId)
	}
}

function createInputDefinition(
	id: string,
	valueType: GraphInputDefinition['valueType']
): GraphInputDefinition {
	if (valueType === 'number') {
		return { id, label: 'Number', valueType, defaultValue: 1 }
	}
	if (valueType === 'enum') {
		return {
			id,
			label: 'Choice',
			valueType,
			options: ['Option'],
			defaultValue: 'Option',
		}
	}
	if (valueType === 'color') {
		return { id, label: 'Color', valueType, defaultValue: '#eaceac' }
	}
	return { id, label: 'Geometry', valueType: 'geometry' }
}
