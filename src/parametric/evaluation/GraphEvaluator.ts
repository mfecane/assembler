import type { Matrix4 } from 'three'
import type {
	EvaluatedInstance,
	EvaluatedAssetSource,
	EvaluatedMaterial,
	EvaluatedNodeOutputs,
	GraphValue,
} from '@/parametric/evaluation/EvaluationTypes'
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
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export interface EvaluatedMesh {
	nodeId: string
	meshId: string
	size: Vector3Snapshot
	matrix: Matrix4
	material?: EvaluatedMaterial
	assetSource?: EvaluatedAssetSource
}

interface EvaluationFrame {
	document: GraphDocumentModel
	graph: GraphDefinition
	inputs: Map<string, GraphValue>
	nodesById: Map<string, GraphNode>
	incomingByTargetPort: Map<string, GraphEdge[]>
	cache: Map<string, EvaluatedNodeOutputs>
	evaluating: Set<string>
}

export class GraphEvaluator {
	public constructor(
		private readonly nodeRegistry: NodeRegistry,
		private readonly meshCatalog: MeshCatalog
	) {}

	public evaluate(document: GraphDocumentModel): EvaluatedMesh[] {
		return this.evaluateGraphOutput(document, document.getEntryGraphId())
	}

	public evaluateGraphOutput(
		document: GraphDocumentModel,
		graphId: string
	): EvaluatedMesh[] {
		const graph = document.getGraph(graphId)
		if (!graph) return []
		const value = this.evaluateGraph(
			document,
			graph,
			this.previewInputs(document, graph)
		)
		return this.toEvaluatedMeshes(graph.id, value)
	}

	public evaluateGeometryOutput(
		document: GraphDocumentModel,
		graphId: string,
		nodeId: string,
		outputPort = 'geometry'
	): EvaluatedMesh[] {
		const graph = document.getGraph(graphId)
		if (!graph) return []
		const frame = this.createFrame(document, graph, this.previewInputs(document, graph))
		return this.toEvaluatedMeshes(
			nodeId,
			this.evaluateNodeOutputs(frame, nodeId).get(outputPort)
		)
	}

	public evaluateOutput(
		document: GraphDocumentModel,
		graphId: string,
		nodeId: string,
		outputPort: string
	): GraphValue | undefined {
		const graph = document.getGraph(graphId)
		if (!graph) return undefined
		const frame = this.createFrame(document, graph, this.previewInputs(document, graph))
		return this.evaluateNodeOutputs(frame, nodeId).get(outputPort)
	}

	private evaluateGraph(
		document: GraphDocumentModel,
		graph: GraphDefinition,
		inputs: Map<string, GraphValue>
	): GraphValue | undefined {
		const outputNode = graph.model.getOutputNode()
		if (!outputNode) return undefined
		const frame = this.createFrame(document, graph, inputs)
		return this.resolveInput(frame, outputNode, graph.output.id)
	}

	private createFrame(
		document: GraphDocumentModel,
		graph: GraphDefinition,
		inputs: Map<string, GraphValue>
	): EvaluationFrame {
		const nodesById = new Map(graph.model.getNodes().map((node) => [node.id, node]))
		const incomingByTargetPort = new Map<string, GraphEdge[]>()
		for (const edge of graph.model.getEdges()) {
			if (edge.targetPort) {
				const key = this.portKey(edge.targetNodeId, edge.targetPort)
				incomingByTargetPort.set(key, [...(incomingByTargetPort.get(key) ?? []), edge])
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
				graphId: frame.graph.id,
				resolveInput: (targetNode, portId) => this.resolveInput(frame, targetNode, portId),
				getMeshBounds: (meshId) => this.meshCatalog.getBounds(meshId),
			})
		}

		outputs = this.nodeRegistry.applyCapabilities(node, outputs)
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

		const value = this.evaluateGraph(frame.document, targetGraph, inputs)
		if (!value) return new Map()
		if (value.valueType !== 'geometry' || !Array.isArray(value.value)) {
			return new Map([[targetGraph.output.id, value]])
		}
		const scopedInstances = (value.value as EvaluatedInstance[]).map((instance) => ({
			...instance,
			instanceId: `${node.id}/${instance.instanceId}`,
		}))
		return new Map([[
			targetGraph.output.id,
			{ valueType: 'geometry', value: scopedInstances },
		]])
	}

	private resolveInput(
		frame: EvaluationFrame,
		node: GraphNode,
		portId: string
	): GraphValue | undefined {
		const edges = frame.incomingByTargetPort.get(this.portKey(node.id, portId)) ?? []
		if (edges.length > 0) {
			const port = this.nodeRegistry.getInputPorts(node, {
				containingGraphId: frame.graph.id,
				getGraphInterface: (graphId) => frame.document.getGraphInterface(graphId),
			}).find((candidate) => candidate.id === portId)
			if (!port) {
				throw new Error(
					`Cannot resolve graph "${frame.graph.id}" node "${node.id}" (${node.type}) port "${portId}": `
					+ `the port is not defined; incoming edges: ${edges.map((edge) => edge.id).join(', ')}`
				)
			}
			const values = edges.flatMap((edge) => {
				if (!edge.sourcePort) return []
				const value = this.evaluateNodeOutputs(frame, edge.sourceNodeId).get(edge.sourcePort)
				return value ? [value] : []
			})
			if (this.nodeRegistry.isAggregateInput(port.valueType)) {
				return this.nodeRegistry.aggregateInputs(
					port.valueType,
					values,
					`Cannot aggregate graph "${frame.graph.id}" node "${node.id}" (${node.type}) port `
					+ `"${portId}" from edges [${edges.map((edge) => edge.id).join(', ')}]`
				)
			}
			return values[0]
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

	private toEvaluatedMeshes(nodeId: string, value: GraphValue | undefined): EvaluatedMesh[] {
		if (value?.valueType !== 'geometry' || !Array.isArray(value.value)) return []
		return (value.value as EvaluatedInstance[]).map((instance) => ({
			nodeId: `${nodeId}/${instance.instanceId}`,
			meshId: instance.meshId,
			size: instance.size,
			matrix: instance.matrix,
			material: instance.material,
			assetSource: instance.assetSource,
		}))
	}

	private portKey(nodeId: string, portId: string): string {
		return `${nodeId}:${portId}`
	}
}
