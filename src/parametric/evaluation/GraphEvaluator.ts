import type {
	EvaluatedNodeOutputs,
	GraphValue,
} from '@/parametric/evaluation/EvaluationTypes'
import {
	emptySceneMetadata,
	isSceneMetadata,
	type SceneMetadata,
	type SceneNodeInstanceReference,
} from '@/parametric/evaluation/SceneMetadata'
import type { GraphEdge } from '@/parametric/model/GraphEdge'
import {
	type GraphDefinition,
	GraphDocumentModel,
	type GraphInputDefinition,
} from '@/parametric/model/GraphDocumentModel'
import {
	GraphInputGraphNode,
	GraphInstanceGraphNode,
	type GraphNode,
} from '@/parametric/model/GraphNode'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'

interface EvaluationFrame {
	document: GraphDocumentModel
	graph: GraphDefinition
	inputs: Map<string, GraphValue>
	nodesById: Map<string, GraphNode>
	incomingByTargetPort: Map<string, GraphEdge>
	cache: Map<string, EvaluatedNodeOutputs>
	evaluating: Set<string>
	graphInstancePath: readonly string[]
}

export class GraphEvaluator {
	public constructor(
		private readonly nodeRegistry: NodeRegistry,
		private readonly meshCatalog: MeshCatalog
	) {}

	public evaluate(document: GraphDocumentModel): SceneMetadata {
		return this.evaluateGraphOutput(document, document.getEntryGraphId())
	}

	public evaluateGraphOutput(
		document: GraphDocumentModel,
		graphId: string
	): SceneMetadata {
		const graph = document.getGraph(graphId)
		if (!graph) return emptySceneMetadata()
		const value = this.evaluateGraph(
			document,
			graph,
			this.previewInputs(document, graph),
			[graph.id]
		)
		return this.toSceneMetadata(value)
	}

	public evaluateGeometryOutput(
		document: GraphDocumentModel,
		graphId: string,
		nodeId: string,
		outputPort = 'geometry'
	): SceneMetadata {
		const graph = document.getGraph(graphId)
		if (!graph) return emptySceneMetadata()
		const frame = this.createFrame(
			document,
			graph,
			this.previewInputs(document, graph),
			[graph.id]
		)
		return this.toSceneMetadata(this.evaluateNodeOutputs(frame, nodeId).get(outputPort))
	}

	public evaluateOutput(
		document: GraphDocumentModel,
		graphId: string,
		nodeId: string,
		outputPort: string
	): GraphValue | undefined {
		const graph = document.getGraph(graphId)
		if (!graph) return undefined
		const frame = this.createFrame(
			document,
			graph,
			this.previewInputs(document, graph),
			[graph.id]
		)
		return this.evaluateNodeOutputs(frame, nodeId).get(outputPort)
	}

	private evaluateGraph(
		document: GraphDocumentModel,
		graph: GraphDefinition,
		inputs: Map<string, GraphValue>,
		graphInstancePath: readonly string[]
	): GraphValue | undefined {
		const outputNode = graph.model.getOutputNode()
		if (!outputNode) return undefined
		const frame = this.createFrame(document, graph, inputs, graphInstancePath)
		return this.resolveInput(frame, outputNode, graph.output.id)
	}

	private createFrame(
		document: GraphDocumentModel,
		graph: GraphDefinition,
		inputs: Map<string, GraphValue>,
		graphInstancePath: readonly string[]
	): EvaluationFrame {
		const nodesById = new Map(graph.model.getNodes().map((node) => [node.id, node]))
		const incomingByTargetPort = new Map<string, GraphEdge>()
		for (const edge of graph.model.getEdges()) {
			if (edge.targetPort) {
				incomingByTargetPort.set(this.portKey(edge.targetNodeId, edge.targetPort), edge)
			}
		}
		return {
			document,
			graph,
			inputs,
			nodesById,
			incomingByTargetPort,
			cache: new Map(),
			evaluating: new Set(),
			graphInstancePath,
		}
	}

	private evaluateNodeOutputs(frame: EvaluationFrame, nodeId: string): EvaluatedNodeOutputs {
		const cached = frame.cache.get(nodeId)
		if (cached) return cached
		if (frame.evaluating.has(nodeId)) return new Map()

		const node = frame.nodesById.get(nodeId)
		if (!node) return new Map()
		frame.evaluating.add(nodeId)

		let outputs: EvaluatedNodeOutputs
		if (node instanceof GraphInputGraphNode) {
			const value = frame.inputs.get(node.getInputId())
			outputs = value ? new Map([[node.getInputId(), value]]) : new Map()
		} else if (node instanceof GraphInstanceGraphNode) {
			outputs = this.evaluateInstance(frame, node)
		} else {
			outputs = this.nodeRegistry.evaluate(node, {
				resolveInput: (targetNode, portId) => this.resolveInput(frame, targetNode, portId),
				getMeshBounds: (meshId) => this.meshCatalog.getBounds(meshId),
				getNodeInstanceReference: (sourceNodeId) =>
					this.getNodeInstanceReference(frame, sourceNodeId),
			})
		}

		frame.evaluating.delete(nodeId)
		frame.cache.set(nodeId, outputs)
		return outputs
	}

	private evaluateInstance(
		frame: EvaluationFrame,
		node: GraphInstanceGraphNode
	): EvaluatedNodeOutputs {
		const targetGraph = frame.document.getGraph(node.getGraphId())
		if (!targetGraph) return new Map()

		const inputs = new Map<string, GraphValue>()
		for (const input of targetGraph.inputs) {
			const supplied = this.resolveInput(frame, node, input.id)
			const value = supplied ?? this.defaultValue(input)
			if (value) inputs.set(input.id, value)
		}

		const value = this.evaluateGraph(
			frame.document,
			targetGraph,
			inputs,
			[...frame.graphInstancePath, node.id]
		)
		if (!value) return new Map()
		if (value.valueType !== 'geometry' || !isSceneMetadata(value.value)) {
			return new Map([[targetGraph.output.id, value]])
		}
		const scopedInstances = value.value.assetInstances.map((instance) => ({
			...instance,
			instanceId: `${node.id}/${instance.instanceId}`,
		}))
		return new Map([[
			targetGraph.output.id,
			{ valueType: 'geometry', value: { assetInstances: scopedInstances } },
		]])
	}

	private resolveInput(
		frame: EvaluationFrame,
		node: GraphNode,
		portId: string
	): GraphValue | undefined {
		const edge = frame.incomingByTargetPort.get(this.portKey(node.id, portId))
		if (edge?.sourcePort) {
			return this.evaluateNodeOutputs(frame, edge.sourceNodeId).get(edge.sourcePort)
		}

		const fallback = this.nodeRegistry.getInputDefault(node, portId)
		return fallback
			? { valueType: fallback.valueType, value: fallback.value }
			: undefined
	}

	private defaultInputs(graph: GraphDefinition): Map<string, GraphValue> {
		const inputs = new Map<string, GraphValue>()
		for (const input of graph.inputs) {
			const value = this.defaultValue(input)
			if (value) inputs.set(input.id, value)
		}
		return inputs
	}

	private previewInputs(
		document: GraphDocumentModel,
		graph: GraphDefinition
	): Map<string, GraphValue> {
		if (graph.id !== document.getEntryGraphId()) return this.defaultInputs(graph)
		const inputs = new Map<string, GraphValue>()
		for (const input of graph.inputs) {
			const value = document.getEntryInputValue(input.id)
			if (value !== undefined) inputs.set(input.id, { valueType: input.valueType, value })
		}
		return inputs
	}

	private defaultValue(input: GraphInputDefinition): GraphValue | undefined {
		return input.defaultValue === undefined
			? undefined
			: { valueType: input.valueType, value: input.defaultValue }
	}

	private toSceneMetadata(value: GraphValue | undefined): SceneMetadata {
		return value?.valueType === 'geometry' && isSceneMetadata(value.value)
			? value.value
			: emptySceneMetadata()
	}

	private getNodeInstanceReference(
		frame: EvaluationFrame,
		nodeId: string
	): SceneNodeInstanceReference {
		return {
			graphId: frame.graph.id,
			nodeId,
			nodeInstanceId: [...frame.graphInstancePath, nodeId].join('/'),
		}
	}

	private portKey(nodeId: string, portId: string): string {
		return `${nodeId}:${portId}`
	}
}
