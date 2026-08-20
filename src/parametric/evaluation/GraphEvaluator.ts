import type {
	EvaluatedNodeOutputs,
	GraphValue,
} from '@/parametric/evaluation/EvaluationTypes'
import { applyTransform } from '@/parametric/evaluation/applyTransform'
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
	GraphInstanceGraphNode,
	type GraphNode,
} from '@/parametric/model/GraphNode'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'
import { MaterialInstance } from '@/parametric/model/MaterialInstance'
import { Vector3Value } from '@/parametric/model/Vector3Value'

interface EvaluationFrame {
	document: GraphDocumentModel
	graph: GraphDefinition
	inputs: Map<string, GraphValue>
	nodesById: Map<string, GraphNode>
	incomingByTargetPort: Map<string, GraphEdge[]>
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
		return this.evaluateGraphOutput(document, document.getDefaultRootGraphId())
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
		if (node instanceof GraphInstanceGraphNode) {
			outputs = this.evaluateInstance(frame, node)
		} else {
			outputs = this.nodeRegistry.evaluate(node, {
				resolveInput: (targetNode, portId) => this.resolveInput(frame, targetNode, portId),
				resolveInputs: (targetNode, portId) => this.resolveInputs(frame, targetNode, portId),
				resolveGraphInput: (inputId) => frame.inputs.get(inputId),
				getMeshBounds: (meshId) => this.meshCatalog.getBounds(meshId),
				getMeshMetadata: (meshId) => this.meshCatalog.getMetadata(meshId),
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
			const instanceValue = node.getInputValue(input.id)
			const value = supplied ?? (
				instanceValue === undefined ? undefined : this.inputValue(input, instanceValue)
			) ?? this.defaultValue(input)
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
			{
				valueType: 'geometry',
				value: {
					assetInstances: applyTransform(
						node.getTransform(),
						scopedInstances,
						(instance) => instance.instanceId
					),
				},
			},
		]])
	}

	private resolveInput(
		frame: EvaluationFrame,
		node: GraphNode,
		portId: string
	): GraphValue | undefined {
		const values = this.resolveInputs(frame, node, portId)
		if (values.length === 1) return values[0]
		if (values.length > 1 && values.every(
			(value) => value.valueType === 'geometry' && isSceneMetadata(value.value)
		)) {
			return {
				valueType: 'geometry',
				value: {
					assetInstances: values.flatMap((value) =>
						isSceneMetadata(value.value) ? value.value.assetInstances : []
					),
				},
			}
		}
		if (values.length > 0) return values[0]

		const fallback = this.nodeRegistry.getInputDefault(node, portId)
		return fallback
			? { valueType: fallback.valueType, value: fallback.value }
			: undefined
	}

	private resolveInputs(
		frame: EvaluationFrame,
		node: GraphNode,
		portId: string
	): GraphValue[] {
		const edges = frame.incomingByTargetPort.get(this.portKey(node.id, portId)) ?? []
		if (node.type === 'vector3') {
			console.log(
				`[node-chain-debug] stage=vector3-port graph="${frame.graph.id}" node="${node.id}" `
				+ `port="${portId}" edgeCount=${edges.length} `
				+ `sources="${edges.map((edge) => `${edge.sourceNodeId}:${edge.sourcePort ?? 'missing'}`).join(',')}"`
			)
		}
		return edges.flatMap((edge) => {
			if (!edge.sourcePort) return []
			const value = this.evaluateNodeOutputs(frame, edge.sourceNodeId).get(edge.sourcePort)
			if (!value) return []
			return [this.applyVectorComponent(frame, edge, value, node, portId)]
		})
	}

	private applyVectorComponent(
		frame: EvaluationFrame,
		edge: GraphEdge,
		value: GraphValue,
		targetNode: GraphNode,
		targetPortId: string
	): GraphValue {
		if (!edge.component) return value
		if (value.valueType === 'vector3' && Vector3Value.isSnapshot(value.value)) {
			return { valueType: 'number', value: value.value[edge.component] }
		}
		if (value.valueType === 'number' && typeof value.value === 'number') {
			const vector = this.getVectorComponentFallback(frame, targetNode, targetPortId)
			return {
				valueType: 'vector3',
				value: { ...vector, [edge.component]: value.value },
			}
		}
		throw new Error(
			`Cannot apply Vector3 component "${edge.component}" on edge "${edge.id}" from `
			+ `"${edge.sourceNodeId}.${edge.sourcePort}" to `
			+ `"${edge.targetNodeId}.${edge.targetPort}": evaluated source type is `
			+ `"${value.valueType}" with value ${JSON.stringify(value.value)}.`
		)
	}

	private getVectorComponentFallback(
		frame: EvaluationFrame,
		targetNode: GraphNode,
		targetPortId: string
	): { x: number; y: number; z: number } {
		const fallback = this.nodeRegistry.getInputDefault(targetNode, targetPortId)
		if (fallback?.valueType === 'vector3' && Vector3Value.isSnapshot(fallback.value)) {
			return fallback.value
		}
		if (targetNode instanceof GraphInstanceGraphNode) {
			const input = frame.document.getGraph(targetNode.getGraphId())?.inputs.find(
				(candidate) => candidate.id === targetPortId
			)
			const value = targetNode.getInputValue(targetPortId) ?? input?.defaultValue
			if (Vector3Value.isSnapshot(value)) return value
		}
		return { x: 0, y: 0, z: 0 }
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
		if (!document.isRootGraph(graph.id)) return this.defaultInputs(graph)
		const inputs = new Map<string, GraphValue>()
		for (const input of graph.inputs) {
			const value = document.getRootInputValue(graph.id, input.id)
			if (value !== undefined) inputs.set(input.id, this.inputValue(input, value))
		}
		return inputs
	}

	private defaultValue(input: GraphInputDefinition): GraphValue | undefined {
		return input.defaultValue === undefined
			? undefined
			: this.inputValue(input, input.defaultValue)
	}

	private inputValue(input: GraphInputDefinition, value: unknown): GraphValue {
		if (input.valueType === 'materialInstance') {
			if (typeof value !== 'string') {
				throw new Error(
					`Graph input "${input.id}" requires a material ID string. Received ${JSON.stringify(value)}.`
				)
			}
			return { valueType: 'materialInstance', value: new MaterialInstance(value) }
		}
		return { valueType: input.valueType, value }
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
