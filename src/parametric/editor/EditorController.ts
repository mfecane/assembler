import { GraphEdge } from '@/parametric/model/GraphEdge'
import { GraphState, type GraphStateSnapshot } from '@/parametric/editor/GraphState'
import { ReactBridge } from '@/parametric/editor/ReactBridge'
import { CommandFactory } from '@/parametric/editor/commands/CommandFactory'
import { HistoryController } from '@/parametric/editor/commands/HistoryController'
import { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
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
	ArrayGraphNode,
	ColorGraphNode,
	MaterialGraphNode,
	MeshAssetGraphNode,
	MeshSelectorGraphNode,
	OutputGraphNode,
	PrimitiveGraphNode,
	SelectorGraphNode,
	SumGraphNode,
	TransformGraphNode,
	type Axis,
	type GraphNode,
	type GraphPoint,
	type MeshSelection,
	type PrimitiveKind,
	type TransformOrigin,
} from '@/parametric/model/GraphNode'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { createAssetMetadataDocument, type AssetMetadataDocument } from '@/parametric/model/AssetMetadataDocument'
import {
	deserializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import type { CreatableNodeDefinition, NodeRegistry } from '@/parametric/model/NodeDefinition'

export type EditorControllerSnapshot = GraphStateSnapshot

export interface TransformNodeValues {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
}

export class EditorController {
	public readonly history = new HistoryController()
	private readonly state: GraphState
	private readonly commandFactory: CommandFactory
	private readonly evaluator: GraphEvaluator

	public constructor(
		document: GraphDocumentModel,
		private readonly nodeRegistry: NodeRegistry,
		private readonly meshCatalog: MeshCatalog,
		private readonly bridge: ReactBridge
	) {
		this.state = new GraphState(document, nodeRegistry)
		this.commandFactory = new CommandFactory(this.state)
		this.evaluator = new GraphEvaluator(nodeRegistry, meshCatalog)
		this.publishHistory()
	}

	public readonly getSnapshot = (): GraphStateSnapshot => this.state.getSnapshot()

	public readonly subscribe = (listener: () => void): (() => void) => (
		this.state.subscribe(listener)
	)

	public openGraph(graphId: string): void {
		if (!this.state.openGraph(graphId)) return
		this.state.publish()
	}

	public setNodePosition(nodeId: string, position: GraphPoint): void {
		this.execute(
			`Move node "${nodeId}"`,
			() => this.activeModel.getNode(nodeId)?.setPosition(position),
			`node-position:${this.activeGraphId}:${nodeId}`
		)
	}

	public setNodeName(nodeId: string, name: string): void {
		const normalizedName = name.trim()
		if (!normalizedName) return
		this.execute(
			`Rename node "${nodeId}" to "${normalizedName}"`,
			() => this.activeModel.getNode(nodeId)?.setName(normalizedName)
		)
	}

	public addNode(type: string, position: GraphPoint, selectedEdgeId?: string): void {
		this.execute(`Add ${type} node`, () => {
			const id = this.createNodeId(type)
			const node = this.nodeRegistry.create(type, id, position, {
				meshCatalog: this.meshCatalog,
			})
			if (!node) return
			if (selectedEdgeId && this.insertNodeOnEdge(node, selectedEdgeId)) return
			this.activeModel.addNode(node)
		})
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
		this.execute(`Add mesh asset "${meshId}"`, () => {
			const id = this.createNodeId('meshAsset')
			const node = new MeshAssetGraphNode(id, position, mesh.id)
			node.setName('Mesh Asset')
			this.activeModel.addNode(node)
		})
	}

	public addGraphInstance(
		graphId: string,
		position: GraphPoint,
		selectedEdgeId?: string
	): void {
		if (!this.document.getGraph(graphId) || graphId === this.activeGraphId) return
		if (this.wouldCreateReferenceCycle(graphId)) return
		this.execute(`Add instance of graph "${graphId}"`, () => {
			const id = this.createNodeId('graphInstance')
			const node = new GraphInstanceGraphNode(id, position, graphId)
			node.setName(this.document.requireGraph(graphId).label)
			if (selectedEdgeId && this.insertNodeOnEdge(node, selectedEdgeId)) return
			this.activeModel.addNode(node)
		})
	}

	public addGraph(): void {
		this.execute('Add assembly', () => {
			const id = this.createGraphId()
			const outputNode = new OutputGraphNode(`${id}-output`, { x: 500, y: 120 })
			outputNode.setName('Assembly Output')
			const model = new GraphModel(
				this.nodeRegistry,
				[outputNode]
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
			this.state.setActiveGraph(id)
		})
	}

	public renameGraph(graphId: string, label: string): void {
		this.execute(`Rename graph "${graphId}"`, () => this.document.renameGraph(graphId, label))
	}

	public removeGraph(graphId: string): void {
		if (!this.canRemoveGraph(graphId)) return
		this.execute(`Remove graph "${graphId}"`, () => {
			if (!this.document.removeGraph(graphId)) return
			if (this.activeGraphId === graphId) {
				this.state.setActiveGraph(this.document.getEntryGraphId())
			}
		})
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
		this.execute(`Add ${valueType} graph input`, () => {
			const graph = this.document.requireGraph(this.activeGraphId)
			const inputId = this.createInputId(valueType)
			const input = createInputDefinition(inputId, valueType)
			if (!this.document.addInput(graph.id, input)) return
			const boundaryId = this.createNodeId('graphInput')
			const node = new GraphInputGraphNode(boundaryId, position, inputId)
			node.setName(input.label)
			graph.model.addNode(node)
		})
	}

	public updateGraphInput(
		inputId: string,
		update: Partial<Omit<GraphInputDefinition, 'id' | 'valueType'>>
	): void {
		this.execute(
			`Update graph input "${inputId}"`,
			() => this.document.updateInput(this.activeGraphId, inputId, update),
			`graph-input:${this.activeGraphId}:${inputId}`
		)
	}

	public setGraphInputOptions(inputId: string, options: string[]): void {
		const input = this.document.requireGraph(this.activeGraphId).inputs.find(
			(candidate) => candidate.id === inputId
		)
		if (!input) return
		const normalized = [...new Set(options.map((option) => option.trim()).filter(Boolean))]
		if (normalized.length === 0) return
		this.updateGraphInput(inputId, {
			options: normalized,
			defaultValue: normalized.includes(String(input.defaultValue))
				? input.defaultValue
				: normalized[0],
		})
	}

	public addGraphInputOption(inputId: string): void {
		const input = this.getGraphInput(inputId)
		if (!input) return
		const options = input.options ?? []
		let sequence = options.length + 1
		let option = `Option ${sequence}`
		while (options.includes(option)) {
			sequence += 1
			option = `Option ${sequence}`
		}
		this.setGraphInputOptions(inputId, [...options, option])
	}

	public updateGraphInputOption(inputId: string, index: number, value: string): void {
		const input = this.getGraphInput(inputId)
		if (!input?.options?.[index]) return
		this.setGraphInputOptions(
			inputId,
			input.options.map((option, optionIndex) => optionIndex === index ? value : option)
		)
	}

	public removeGraphInputOption(inputId: string, index: number): void {
		const input = this.getGraphInput(inputId)
		if (!input?.options || input.options.length <= 1 || !input.options[index]) return
		this.setGraphInputOptions(
			inputId,
			input.options.filter((_, optionIndex) => optionIndex !== index)
		)
	}

	public removeGraphInput(inputId: string): void {
		this.execute(
			`Remove graph input "${inputId}"`,
			() => this.removeGraphInputFromGraph(this.activeGraphId, inputId)
		)
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
		this.execute(`Remove node "${nodeId}"`, () => {
			const node = this.activeModel.getNode(nodeId)
			if (node instanceof GraphInputGraphNode) {
				this.removeGraphInputFromGraph(this.activeGraphId, node.getInputId())
				return
			}
			this.activeModel.removeNode(nodeId)
		})
	}

	public clearGraph(): void {
		this.execute(`Clear graph "${this.activeGraphId}"`, () => {
			const graph = this.document.requireGraph(this.activeGraphId)
			for (const input of [...graph.inputs]) {
				this.removeGraphInputFromGraph(graph.id, input.id)
			}
			this.activeModel.clearExceptOutput()
		})
	}

	public connect(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null
	): void {
		this.execute(`Connect "${sourceNodeId}" to "${targetNodeId}"`, () => {
			const id = this.createEdgeId(sourceNodeId, targetNodeId, sourcePort, targetPort)
			this.activeModel.connect(
				new GraphEdge(id, sourceNodeId, targetNodeId, sourcePort, targetPort)
			)
		})
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
		this.execute(`Remove connection "${edgeId}"`, () => this.activeModel.removeEdge(edgeId))
	}

	public exportGraph(): GraphDocument {
		return this.state.serialize()
	}

	public exportAssetMetadata(): AssetMetadataDocument {
		return createAssetMetadataDocument(this.meshCatalog)
	}

	public importGraph(value: unknown): void {
		let document: GraphDocumentModel
		try {
			document = deserializeGraph(value, this.nodeRegistry)
		} catch (cause) {
			this.reportCommandError('validate graph document import', cause)
			throw cause
		}
		this.execute('Import graph document', () => this.state.replaceDocument(document))
	}

	public setNumericValue(nodeId: string, field: string, value: number): void {
		this.execute(
			`Set ${field} on node "${nodeId}"`,
			() => this.activeModel.setNumericValue(nodeId, field, value),
			`numeric:${this.activeGraphId}:${nodeId}:${field}`
		)
	}

	public setPrimitive(nodeId: string, value: PrimitiveKind): void {
		this.updateNode<PrimitiveGraphNode>(
			nodeId,
			'primitive',
			`Set primitive on node "${nodeId}"`,
			(node) => node.setPrimitive(value)
		)
	}

	public setPrimitiveSize(nodeId: string, value: Vector3Snapshot): void {
		this.updateNode<PrimitiveGraphNode>(
			nodeId,
			'primitive',
			`Set size on primitive node "${nodeId}"`,
			(node) => node.setSize(Vector3Value.from(value)),
			`primitive-size:${this.activeGraphId}:${nodeId}`
		)
	}

	public setSelectorOptions(nodeId: string, options: string[]): void {
		this.updateNode<SelectorGraphNode>(
			nodeId,
			'selector',
			`Set options on selector node "${nodeId}"`,
			(node) => node.setOptions(options)
		)
	}

	public setSelectorValue(nodeId: string, value: string): void {
		this.updateNode<SelectorGraphNode>(
			nodeId,
			'selector',
			`Set value on selector node "${nodeId}"`,
			(node) => node.setValue(value)
		)
	}

	public setColorNodeValue(nodeId: string, color: string): void {
		this.updateNode<ColorGraphNode>(
			nodeId,
			'color',
			`Set color on node "${nodeId}"`,
			(node) => node.setColor(color)
		)
	}

	public setMeshSelections(nodeId: string, selections: MeshSelection[]): void {
		this.updateNode<MeshSelectorGraphNode>(
			nodeId,
			'meshSelector',
			`Set mesh selections on node "${nodeId}"`,
			(node) => node.setSelections(selections)
		)
	}

	public setMeshAsset(nodeId: string, meshId: string): void {
		this.updateNode<MeshAssetGraphNode>(
			nodeId,
			'meshAsset',
			`Set mesh asset on node "${nodeId}"`,
			(node) => node.setMeshId(meshId)
		)
	}

	public setMaterialColor(nodeId: string, color: string): void {
		this.updateNode<MaterialGraphNode>(
			nodeId,
			'material',
			`Set material color on node "${nodeId}"`,
			(node) => node.setColor(color)
		)
	}

	public setSumEnabled(nodeId: string, value: boolean): void {
		this.updateNode<SumGraphNode>(
			nodeId,
			'sum',
			`Set enabled on sum node "${nodeId}"`,
			(node) => node.setEnabled(value)
		)
	}

	public setArrayAxis(nodeId: string, axis: Axis): void {
		this.updateNode<ArrayGraphNode>(
			nodeId,
			'array',
			`Set array axis on node "${nodeId}"`,
			(node) => node.setAxis(axis)
		)
	}

	public setTransformTranslation(nodeId: string, value: Vector3Snapshot): void {
		this.updateTransformVector(nodeId, 'translation', value)
	}

	public setTransformRotation(nodeId: string, value: Vector3Snapshot): void {
		this.updateTransformVector(nodeId, 'rotation', value)
	}

	public setTransformScale(nodeId: string, value: Vector3Snapshot): void {
		this.updateTransformVector(nodeId, 'scale', value)
	}

	public setTransformOrigin(nodeId: string, value: TransformOrigin): void {
		this.updateNode<TransformGraphNode>(
			nodeId,
			'transform',
			`Set transform origin on node "${nodeId}"`,
			(node) => node.setOrigin(value)
		)
	}

	public setTransformCopy(nodeId: string, value: boolean): void {
		this.updateNode<TransformGraphNode>(
			nodeId,
			'transform',
			`Set transform copy on node "${nodeId}"`,
			(node) => node.setCopy(value)
		)
	}

	public setTransformUniformScale(nodeId: string, value: boolean): void {
		this.updateNode<TransformGraphNode>(
			nodeId,
			'transform',
			`Set uniform scale on node "${nodeId}"`,
			(node) => node.setUniformScale(value)
		)
	}

	public setTransformNodeValues(
		graphId: string,
		nodeId: string,
		before: TransformNodeValues,
		after: TransformNodeValues,
		historyGroup: string
	): void {
		this.updateNodeInGraph<TransformGraphNode>(
			graphId,
			nodeId,
			'transform',
			`Transform node "${nodeId}" in 3D editor`,
			(node) => {
				const normalizedAfter = node.getUniformScale()
					? { ...after, scale: normalizeUniformScale(before.scale, after.scale) }
					: after
				node.setTranslation(Vector3Value.from(normalizedAfter.translation))
				node.setRotation(Vector3Value.from(normalizedAfter.rotation))
				node.setScale(Vector3Value.from(normalizedAfter.scale))
			},
			`viewport-transform:${graphId}:${nodeId}:${historyGroup}`
		)
	}

	private updateNode<TNode extends GraphNode>(
		nodeId: string,
		expectedType: string,
		label: string,
		update: (node: TNode) => void,
		mergeKey?: string
	): void {
		this.updateNodeInGraph(this.activeGraphId, nodeId, expectedType, label, update, mergeKey)
	}

	private updateNodeInGraph<TNode extends GraphNode>(
		graphId: string,
		nodeId: string,
		expectedType: string,
		label: string,
		update: (node: TNode) => void,
		mergeKey?: string
	): void {
		const node = this.document.getGraph(graphId)?.model.getNode(nodeId)
		if (!node || node.type !== expectedType) return
		this.execute(label, () => update(node as TNode), mergeKey)
	}

	public setEntryInputValue(inputId: string, value: GraphInputValue): void {
		this.execute(
			`Set entry input "${inputId}"`,
			() => this.document.setEntryInputValue(inputId, value),
			`entry-input:${inputId}`
		)
	}

	public setConfigurationControls(controls: ConfigurationPanelControl[]): void {
		this.execute('Update configuration panel', () => {
			this.document.setConfigurationControls(controls)
		})
	}

	public undo(): void {
		this.applyHistory('undo', () => this.history.undo())
	}

	public redo(): void {
		this.applyHistory('redo', () => this.history.redo())
	}

	public evaluateGraphOutput(graphId = this.activeGraphId) {
		return this.evaluator.evaluateGraphOutput(this.document, graphId)
	}

	public evaluateGeometryOutput(graphId: string, nodeId: string) {
		return this.evaluator.evaluateGeometryOutput(this.document, graphId, nodeId)
	}

	public evaluateOutput(graphId: string, nodeId: string, portId: string) {
		return this.evaluator.evaluateOutput(this.document, graphId, nodeId, portId)
	}

	private get document(): GraphDocumentModel {
		return this.state.getDocument()
	}

	private get activeGraphId(): string {
		return this.state.getActiveGraphId()
	}

	private get activeModel(): GraphModel {
		return this.state.getActiveModel()
	}

	private getGraphInput(inputId: string): GraphInputDefinition | undefined {
		return this.document.requireGraph(this.activeGraphId).inputs.find(
			(input) => input.id === inputId
		)
	}

	private updateTransformVector(
		nodeId: string,
		field: 'translation' | 'rotation' | 'scale',
		value: Vector3Snapshot
	): void {
		this.updateNode<TransformGraphNode>(
			nodeId,
			'transform',
			`Set ${field} on transform node "${nodeId}"`,
			(node) => {
				const vector = Vector3Value.from(value)
				if (field === 'translation') node.setTranslation(vector)
				else if (field === 'rotation') node.setRotation(vector)
				else node.setScale(vector)
			},
			`transform-${field}:${this.activeGraphId}:${nodeId}`
		)
	}

	private execute(label: string, mutation: () => void, mergeKey?: string): void {
		try {
			const changed = this.history.execute(
				this.commandFactory.mutate(label, mutation, mergeKey)
			)
			if (!changed) return
			this.state.publish()
			this.publishHistory()
		} catch (cause) {
			this.reportCommandError(label, cause)
			throw cause
		}
	}

	private applyHistory(action: 'undo' | 'redo', apply: () => boolean): void {
		try {
			if (!apply()) return
			this.state.publish()
			this.publishHistory()
		} catch (cause) {
			this.reportCommandError(action, cause)
			throw cause
		}
	}

	private publishHistory(): void {
		this.bridge.update({
			canUndo: this.history.canUndo(),
			canRedo: this.history.canRedo(),
		})
	}

	private reportCommandError(action: string, cause: unknown): void {
		const snapshot = this.state.getSnapshot()
		const error = [
			`Failed to ${action}.`,
			`Active graph: "${snapshot.activeGraphId}".`,
			`Document version: ${snapshot.documentVersion}.`,
			`Undo available: ${this.history.canUndo()}.`,
			`Redo available: ${this.history.canRedo()}.`,
			describeError(cause),
		].join(' ')
		console.error(error, {
			cause,
			action,
			activeGraphId: snapshot.activeGraphId,
			documentVersion: snapshot.documentVersion,
			canUndo: this.history.canUndo(),
			canRedo: this.history.canRedo(),
		})
		this.bridge.update({ error })
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
	if (valueType === 'boolean') {
		return { id, label: 'Boolean', valueType, defaultValue: false }
	}
	return { id, label: 'Geometry', valueType: 'geometry' }
}

function normalizeUniformScale(
	before: Vector3Snapshot,
	after: Vector3Snapshot
): Vector3Snapshot {
	const changedAxis = (['x', 'y', 'z'] as const).find(
		(axis) => after[axis] !== before[axis]
	)
	const value = changedAxis ? after[changedAxis] : after.x
	return { x: value, y: value, z: value }
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause)
	} catch {
		return String(cause)
	}
}
