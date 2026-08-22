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
	type GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import {
	GraphInstanceGraphNode,
	NumberAggregatorGraphNode,
	RepeatInputGraphNode,
	RepeatOutputGraphNode,
	type GraphNode,
} from '@/parametric/model/GraphNode'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'
import { MaterialInstance } from '@/parametric/model/MaterialInstance'
import { RepeatZone } from '@/parametric/model/RepeatZone'
import { TransformField } from '@/parametric/model/fields/TransformField'
import { Vector3Value } from '@/parametric/model/Vector3Value'

interface EvaluationCacheScope {
	nodeIds?: ReadonlySet<string>
	values: Map<string, EvaluatedNodeOutputs>
}

interface EvaluationFrame {
	document: GraphDocumentModel
	graph: GraphDefinition
	inputs: Map<string, GraphValue>
	nodesById: Map<string, GraphNode>
	incomingByTargetPort: Map<string, GraphEdge[]>
	cacheScopes: readonly EvaluationCacheScope[]
	evaluating: Set<string>
	graphInstancePath: readonly string[]
	repeatIterations: ReadonlyMap<string, number>
	numberAggregatorValues: ReadonlyMap<string, number>
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

	public evaluateGraphInstance(
		document: GraphDocumentModel,
		graphId: string,
		inputValues: Record<string, GraphInputValue>,
		instanceId: string
	): SceneMetadata {
		const graph = document.requireGraph(graphId)
		const value = this.evaluateGraph(
			document,
			graph,
			this.instanceInputs(graph, inputValues),
			[instanceId, graph.id]
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
			cacheScopes: [{ values: new Map() }],
			evaluating: new Set(),
			graphInstancePath,
			repeatIterations: new Map(),
			numberAggregatorValues: new Map(),
		}
	}

	private evaluateNodeOutputs(frame: EvaluationFrame, nodeId: string): EvaluatedNodeOutputs {
		const cache = this.getNodeCache(frame, nodeId)
		const cached = cache.get(nodeId)
		if (cached) return cached
		if (frame.evaluating.has(nodeId)) return new Map()

		const node = frame.nodesById.get(nodeId)
		if (!node) return new Map()
		frame.evaluating.add(nodeId)

		let outputs: EvaluatedNodeOutputs
		if (node instanceof GraphInstanceGraphNode) {
			outputs = this.evaluateInstance(frame, node)
		} else if (node instanceof RepeatOutputGraphNode) {
			outputs = this.evaluateRepeatOutput(frame, node)
		} else if (node instanceof NumberAggregatorGraphNode) {
			outputs = this.evaluateNumberAggregator(frame, node)
		} else {
			outputs = this.nodeRegistry.evaluate(node, {
				resolveInput: (targetNode, portId) => this.resolveInput(frame, targetNode, portId),
				resolveInputs: (targetNode, portId) => this.resolveInputs(frame, targetNode, portId),
				resolveGraphInput: (inputId) => frame.inputs.get(inputId),
				getMeshMetadata: (meshId) => this.meshCatalog.getMetadata(meshId),
				getNodeInstanceReference: (sourceNodeId) =>
					this.getNodeInstanceReference(frame, sourceNodeId),
				getRepeatIteration: (repeatInputId) => frame.repeatIterations.get(repeatInputId),
			})
		}

		frame.evaluating.delete(nodeId)
		cache.set(nodeId, outputs)
		return outputs
	}

	private evaluateRepeatOutput(
		frame: EvaluationFrame,
		node: RepeatOutputGraphNode
	): EvaluatedNodeOutputs {
		const repeatInput = frame.nodesById.get(node.getRepeatInputId())
		if (!(repeatInput instanceof RepeatInputGraphNode)) {
			throw new Error(
				`Cannot evaluate Repeat Output node "${node.id}" in graph "${frame.graph.id}": `
				+ `linked Repeat Input "${node.getRepeatInputId()}" is missing or has type `
				+ `${JSON.stringify(repeatInput?.type)}.`
			)
		}
		const instancesValue = this.resolveInput(frame, repeatInput, 'instances')
		if (
			instancesValue?.valueType !== 'number'
			|| typeof instancesValue.value !== 'number'
			|| !Number.isFinite(instancesValue.value)
		) {
			throw new Error(
				`Cannot evaluate Repeat Zone "${repeatInput.id}" in graph "${frame.graph.id}": `
				+ `Instances must resolve to a finite number, received ${JSON.stringify(instancesValue)}.`
			)
		}

		const instanceCount = Math.max(0, Math.floor(instancesValue.value))
		if (instanceCount === 0) {
			return new Map([[
				'geometry',
				{ valueType: 'geometry', value: { assetInstances: [] } },
			]])
		}
		const repeatZone = new RepeatZone(repeatInput, node)
		const internalNodeIds = repeatZone.getInternalNodeIds(frame.nodesById.values())
		const repeatedNodeIds = new Set([...internalNodeIds, repeatInput.id])
		const aggregators = [...internalNodeIds].flatMap((nodeId) => {
			const candidate = frame.nodesById.get(nodeId)
			if (!(candidate instanceof NumberAggregatorGraphNode)) return []
			const owner = RepeatZone.findOwner(candidate, frame.nodesById.values())
			return owner?.output.id === node.id ? [candidate] : []
		})
		for (const edge of frame.graph.model.getEdges()) {
			const entersZone = internalNodeIds.has(edge.targetNodeId)
				|| edge.targetNodeId === node.id
			if (entersZone && !repeatedNodeIds.has(edge.sourceNodeId)) {
				this.evaluateNodeOutputs(frame, edge.sourceNodeId)
			}
		}
		const aggregatorValues = new Map<string, number>()
		for (const aggregator of aggregators) {
			const initialEdges = frame.incomingByTargetPort.get(
				this.portKey(aggregator.id, 'initialValue')
			) ?? []
			const internalInitialSource = initialEdges.find(
				(edge) => repeatedNodeIds.has(edge.sourceNodeId)
			)
			if (internalInitialSource) {
				throw new Error(
					`Cannot initialize Number Aggregator node "${aggregator.id}" in Repeat Zone `
					+ `"${repeatInput.id}" in graph "${frame.graph.id}": Initial Value is connected `
					+ `from internal node "${internalInitialSource.sourceNodeId}" through edge `
					+ `"${internalInitialSource.id}". Initial Value is resolved once before iteration 0 `
					+ 'and must be stored on the aggregator or connected from outside this zone.'
				)
			}
			const initialValue = this.resolveInput(frame, aggregator, 'initialValue')
			if (
				initialValue?.valueType !== 'number'
				|| typeof initialValue.value !== 'number'
				|| !Number.isFinite(initialValue.value)
			) {
				throw new Error(
					`Cannot initialize Number Aggregator node "${aggregator.id}" in Repeat Zone `
					+ `"${repeatInput.id}" in graph "${frame.graph.id}": Initial Value must resolve `
					+ `to a finite number, received ${JSON.stringify(initialValue)}.`
				)
			}
			aggregatorValues.set(aggregator.id, initialValue.value)
		}

		const assetInstances = []
		for (let iteration = 0; iteration < instanceCount; iteration += 1) {
			const iterationFrame: EvaluationFrame = {
				...frame,
				cacheScopes: [
					{ nodeIds: repeatedNodeIds, values: new Map() },
					...frame.cacheScopes,
				],
				evaluating: new Set(),
				graphInstancePath: [
					...frame.graphInstancePath,
					`${repeatInput.id}:${iteration}`,
				],
				repeatIterations: new Map([
					...frame.repeatIterations,
					[repeatInput.id, iteration],
				]),
				numberAggregatorValues: new Map([
					...frame.numberAggregatorValues,
					...aggregatorValues,
				]),
			}
			const iterationInstances = this.resolveInputs(iterationFrame, node, 'geometry').flatMap((value) => {
				if (value.valueType !== 'geometry' || !isSceneMetadata(value.value)) return []
				return value.value.assetInstances.map((instance) => ({
					...instance,
					instanceId: `${node.id}/${iteration}/${instance.instanceId}`,
				}))
			})
			assetInstances.push(...iterationInstances)
			for (const aggregator of aggregators) {
				const addValue = this.resolveInput(iterationFrame, aggregator, 'addValue')
				if (
					addValue?.valueType !== 'number'
					|| typeof addValue.value !== 'number'
					|| !Number.isFinite(addValue.value)
				) {
					throw new Error(
						`Cannot advance Number Aggregator node "${aggregator.id}" after iteration `
						+ `${iteration} in Repeat Zone "${repeatInput.id}" in graph "${frame.graph.id}": `
						+ `Add Value must resolve to a finite number, received ${JSON.stringify(addValue)}.`
					)
				}
				aggregatorValues.set(
					aggregator.id,
					(aggregatorValues.get(aggregator.id) as number) + addValue.value
				)
			}
		}
		return new Map([[
			'geometry',
			{ valueType: 'geometry', value: { assetInstances } },
		]])
	}

	private evaluateNumberAggregator(
		frame: EvaluationFrame,
		node: NumberAggregatorGraphNode
	): EvaluatedNodeOutputs {
		const currentValue = frame.numberAggregatorValues.get(node.id)
		if (currentValue === undefined) {
			const owner = RepeatZone.findOwner(node, frame.nodesById.values())
			throw new Error(
				`Cannot evaluate Number Aggregator node "${node.id}" in graph "${frame.graph.id}": `
				+ 'the node has no active repeat-iteration state. '
				+ (owner
					? `It is positioned inside Repeat Zone "${owner.input.id}" but its Current Value `
						+ 'was requested outside that zone evaluation.'
					: 'It is outside every Repeat Zone. Move its visual center inside a Repeat Zone.')
			)
		}
		return new Map([[
			'currentValue',
			{ valueType: 'number', value: currentValue },
		]])
	}

	private getNodeCache(
		frame: EvaluationFrame,
		nodeId: string
	): Map<string, EvaluatedNodeOutputs> {
		const scope = frame.cacheScopes.find(
			(candidate) => candidate.nodeIds === undefined || candidate.nodeIds.has(nodeId)
		)
		if (!scope) {
			throw new Error(
				`Cannot evaluate node "${nodeId}" in graph "${frame.graph.id}": `
				+ `no evaluation cache scope accepts it. Cache scopes: ${frame.cacheScopes.length}.`
			)
		}
		return scope.values
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
		const translationInput = this.resolveInput(frame, node, 'translation')
		const translation = translationInput?.valueType === 'vector3'
			&& Vector3Value.isSnapshot(translationInput.value)
			? translationInput.value
			: node.getTransform().getTranslation().toSnapshot()
		const transform = new TransformField({
			...node.getTransform().serialize(),
			translation,
		})
		return new Map([[
			targetGraph.output.id,
			{
				valueType: 'geometry',
				value: {
					assetInstances: applyTransform(
						transform,
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

	private instanceInputs(
		graph: GraphDefinition,
		inputValues: Record<string, GraphInputValue>
	): Map<string, GraphValue> {
		const inputs = new Map<string, GraphValue>()
		for (const input of graph.inputs) {
			const value = inputValues[input.id] ?? input.defaultValue
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
