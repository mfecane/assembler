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
	ArrayGraphNode,
	EnumNumberMapGraphNode,
	type EnumNumberMapping,
	GraphInstanceGraphNode,
	GraphInputGraphNode,
	MeshAssetGraphNode,
	MeshSelectorGraphNode,
	OutputGraphNode,
	SelectorGraphNode,
	TransformGraphNode,
	type GraphNode,
	type GraphPoint,
	type MeshSelection,
	isTransformableGraphNode,
} from '@/parametric/model/GraphNode'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { createAssetMetadataDocument, type AssetMetadataDocument } from '@/parametric/model/AssetMetadataDocument'
import {
	deserializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import type { CreatableNodeDefinition, NodeRegistry } from '@/parametric/model/NodeDefinition'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'

export type EditorControllerSnapshot = GraphStateSnapshot

export const ARRAY_DISTANCE_SNAP = 0.01

export interface TransformNodeValues {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
}

export interface NodePositionUpdate {
	nodeId: string
	position: GraphPoint
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

	public openGraph(graphId: string, rootGraphId?: string): void {
		if (!this.state.openGraph(graphId, rootGraphId)) return
		this.state.publish()
	}

	public setNodePosition(nodeId: string, position: GraphPoint): void {
		this.setNodePositions([{ nodeId, position }])
	}

	public setNodePositions(updates: readonly NodePositionUpdate[]): void {
		if (updates.length === 0) return
		const nodeIds = [...new Set(updates.map((update) => update.nodeId))].sort()
		this.execute(
			nodeIds.length === 1
				? `Move node "${nodeIds[0]}"`
				: `Move ${nodeIds.length} nodes`,
			() => {
				for (const update of updates) {
					this.activeModel.getNode(update.nodeId)?.setPosition(update.position)
				}
			},
			`node-positions:${this.activeGraphId}:${nodeIds.join(',')}`,
			false
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
		this.addGraphDefinition(false)
	}

	public addRootGraph(): void {
		this.addGraphDefinition(true)
	}

	private addGraphDefinition(root: boolean): void {
		this.execute(root ? 'Add root assembly' : 'Add assembly', () => {
			const id = this.createGraphId()
			const outputNode = new OutputGraphNode(`${id}-output`, { x: 500, y: 120 })
			outputNode.setName('Assembly Output')
			const model = new GraphModel(
				this.nodeRegistry,
				[outputNode]
			)
			this.document.addGraph({
				id,
				label: root
					? `Root ${this.document.getRootGraphs().length + 1}`
					: `Assembly ${this.document.getGraphs().length + 1}`,
				inputs: [],
				output: { id: 'geometry', label: 'Geometry', valueType: 'geometry' },
				model,
			})
			model.setPortContext({
				containingGraphId: id,
				getGraphInterface: (graphId) => this.document.getGraphInterface(graphId),
				getEnumOptions: (enumId) => this.document.getEnumOptions(enumId),
			})
			if (root) this.document.addRootGraph(id)
			this.state.setActiveGraph(id)
		})
	}

	public editGraph(graphId: string, label: string, root: boolean): void {
		const graph = this.document.requireGraph(graphId)
		const normalizedLabel = label.trim()
		if (!normalizedLabel) {
			throw new Error(`Cannot edit graph "${graphId}": the graph name cannot be empty.`)
		}
		const wasRoot = this.document.isRootGraph(graphId)
		if (wasRoot === root && graph.label === normalizedLabel) return
		if (wasRoot && !root && this.document.getRootGraphs().length === 1) {
			throw new Error(
				`Cannot change graph "${graphId}" to a subgraph: the project requires at least one root graph.`
			)
		}
		this.execute(`Edit graph "${graphId}"`, () => {
			this.document.renameGraph(graphId, normalizedLabel)
			if (wasRoot === root) return
			if (root) {
				this.document.addRootGraph(graphId)
				this.state.openGraph(graphId, graphId)
				return
			}
			if (!this.document.removeRootGraph(graphId)) {
				throw new Error(
					`Cannot change graph "${graphId}" to a subgraph: `
						+ `the graph is not a removable root. Root count: ${this.document.getRootGraphs().length}.`
				)
			}
			if (this.state.getActiveRootGraphId() === graphId) {
				this.state.openGraph(graphId, this.document.getDefaultRootGraphId())
			}
		})
	}

	public removeGraph(graphId: string): void {
		if (!this.canRemoveGraph(graphId)) return
		this.execute(`Remove graph "${graphId}"`, () => {
			if (!this.document.removeGraph(graphId)) return
			if (
				this.activeGraphId === graphId
				|| this.state.getActiveRootGraphId() === graphId
			) {
				this.state.setActiveGraph(this.document.getDefaultRootGraphId())
			}
		})
	}

	public canRemoveGraph(graphId: string): boolean {
		if (this.document.isRootGraph(graphId) && this.document.getRootGraphs().length === 1) return false
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
		const displayedType = valueType === 'enum'
			? 'choice'
			: valueType === 'numberArray'
				? 'number array'
				: valueType
		this.execute(`Add ${displayedType} graph input`, () => {
			const graph = this.document.requireGraph(this.activeGraphId)
			const inputId = this.createInputId(valueType)
			const enumId = valueType === 'enum' ? this.createEnumDefinition() : undefined
			const input = createInputDefinition(inputId, valueType, enumId)
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
			() => {
				if (!this.document.updateInput(this.activeGraphId, inputId, update)) return
				this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
			},
			`graph-input:${this.activeGraphId}:${inputId}`
		)
	}

	public setGraphInputEnum(inputId: string, enumId: string): void {
		const input = this.getGraphInput(inputId)
		if (input?.valueType !== 'enum' || input.enumId === enumId) return
		this.execute(`Use choice set "${enumId}" for graph input "${inputId}"`, () => {
			this.document.setInputEnum(this.activeGraphId, inputId, enumId)
			this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
			this.reconcileEnumMappingsForInput(this.activeGraphId, inputId)
		})
	}

	public createEnumForGraphInput(inputId: string): void {
		const input = this.getGraphInput(inputId)
		if (input?.valueType !== 'enum') return
		this.execute(`Create choice set for graph input "${inputId}"`, () => {
			const enumId = this.createEnumDefinition()
			this.document.setInputEnum(this.activeGraphId, inputId, enumId)
			this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
			this.reconcileEnumMappingsForInput(this.activeGraphId, inputId)
		})
	}

	public renameEnum(enumId: string, name: string): void {
		this.execute(
			`Rename choice set "${enumId}" to "${name.trim()}"`,
			() => this.document.renameEnum(enumId, name),
			`enum-name:${enumId}`
		)
	}

	public addEnumOption(enumId: string): void {
		const options = this.document.requireEnumDefinition(enumId).options
		let sequence = options.length + 1
		let option = `Option ${sequence}`
		while (options.includes(option)) {
			sequence += 1
			option = `Option ${sequence}`
		}
		this.execute(`Add choice to choice set "${enumId}"`, () => {
			this.document.addEnumOption(enumId, option)
		})
	}

	public renameEnumOption(enumId: string, index: number, option: string): void {
		this.execute(`Rename choice ${index + 1} in choice set "${enumId}"`, () => {
			const previousOption = this.document.renameEnumOption(enumId, index, option)
			if (previousOption === option.trim()) return
			this.reconcileEnumOptionReferences(enumId, previousOption, option.trim())
		})
	}

	public removeEnumOption(enumId: string, index: number): void {
		this.execute(`Remove choice ${index + 1} from choice set "${enumId}"`, () => {
			this.document.removeEnumOption(enumId, index)
			this.reconcileEnumOptionReferences(enumId)
		})
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
		this.reconcileGraphInstanceInputValues(graph.id, inputId)
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

	public canCopyNode(nodeId: string): boolean {
		const node = this.activeModel.getNode(nodeId)
		return Boolean(
			node
			&& !(node instanceof GraphInputGraphNode)
			&& !this.nodeRegistry.isOutput(node)
		)
	}

	public copyNode(nodeId: string): void {
		if (!this.canCopyNode(nodeId)) return
		this.execute(`Copy node "${nodeId}"`, () => {
			const source = this.activeModel.getNode(nodeId)
			if (!source) return
			const sourcePosition = source.getPosition()
			const copy = this.nodeRegistry.deserialize(
				source.type,
				this.createNodeId(source.type),
				{ x: sourcePosition.x + 32, y: sourcePosition.y + 32 },
				this.nodeRegistry.serialize(source)
			)
			copy.setName(source.getName())
			this.activeModel.addNode(copy)
		})
	}

	public setGraphInstanceInputValue(
		nodeId: string,
		inputId: string,
		value: GraphInputValue
	): void {
		const node = this.activeModel.getNode(nodeId)
		if (!(node instanceof GraphInstanceGraphNode)) return
		const input = this.document.getGraph(node.getGraphId())?.inputs.find(
			(candidate) => candidate.id === inputId
		)
		if (!input || !this.document.isInputValueCompatible(input, value)) return
		this.execute(
			`Set input "${inputId}" on assembly instance "${nodeId}"`,
			() => node.setInputValue(inputId, value),
			`graph-instance-input:${this.activeGraphId}:${nodeId}:${inputId}`
		)
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

	public setFieldValue(nodeId: string, field: string, value: unknown): void {
		this.execute(
			`Set ${field} on node "${nodeId}"`,
			() => this.activeModel.setFieldValue(nodeId, field, value),
			`field:${this.activeGraphId}:${nodeId}:${field}`
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

	public setMeshSelections(nodeId: string, selections: MeshSelection[]): void {
		this.updateNode<MeshSelectorGraphNode>(
			nodeId,
			'meshSelector',
			`Set mesh selections on node "${nodeId}"`,
			(node) => node.setSelections(selections)
		)
	}

	public setEnumNumberMappings(nodeId: string, mappings: EnumNumberMapping[]): void {
		this.updateNode<EnumNumberMapGraphNode>(
			nodeId,
			'enumNumberMap',
			`Set number mappings on node "${nodeId}"`,
			(node) => node.setMappings(mappings)
		)
	}

	public setTransformScale(nodeId: string, value: Vector3Snapshot): void {
		this.updateNode<TransformGraphNode>(
			nodeId,
			'transform',
			`Set scale on transform node "${nodeId}"`,
			(node) => node.setScale(Vector3Value.from(value)),
			`transform-scale:${this.activeGraphId}:${nodeId}`
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
		const node = this.document.getGraph(graphId)?.model.getNode(nodeId)
		if (!isTransformableGraphNode(node)) return
		this.execute(
			`Transform node "${nodeId}" in 3D editor`,
			() => {
				const normalizedAfter = node instanceof TransformGraphNode && node.getUniformScale()
					? { ...after, scale: normalizeUniformScale(before.scale, after.scale) }
					: after
				const transform = node.getTransform()
				transform.setTranslation(Vector3Value.from(normalizedAfter.translation))
				transform.setRotation(Vector3Value.from(normalizedAfter.rotation))
				transform.setScale(Vector3Value.from(normalizedAfter.scale))
			},
			`viewport-transform:${graphId}:${nodeId}:${historyGroup}`
		)
	}

	public setArrayDistance(
		graphId: string,
		nodeId: string,
		value: number,
		historyGroup: string
	): void {
		const node = this.document.getGraph(graphId)?.model.getNode(nodeId)
		if (!(node instanceof ArrayGraphNode) || !Number.isFinite(value)) return
		const snappedValue = Number(
			(Math.round(value / ARRAY_DISTANCE_SNAP) * ARRAY_DISTANCE_SNAP).toFixed(2)
		)
		this.execute(
			`Set duplication distance on array node "${nodeId}" in 3D editor`,
			() => node.setOffset(snappedValue),
			`viewport-array-distance:${graphId}:${nodeId}:${historyGroup}`
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

	public setRootInputValue(
		rootGraphId: string,
		inputId: string,
		value: GraphInputValue
	): void {
		this.execute(
			`Set input "${inputId}" on root graph "${rootGraphId}"`,
			() => this.document.setRootInputValue(rootGraphId, inputId, value),
			`root-input:${rootGraphId}:${inputId}`
		)
	}

	public setConfigurationControls(
		rootGraphId: string,
		controls: ConfigurationPanelControl[]
	): void {
		this.execute(`Update configuration panel for root graph "${rootGraphId}"`, () => {
			this.document.setConfigurationControls(rootGraphId, controls)
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

	private reconcileGraphInstanceInputValues(graphId: string, inputId: string): void {
		const input = this.document.getGraph(graphId)?.inputs.find(
			(candidate) => candidate.id === inputId
		)
		for (const graph of this.document.getGraphs()) {
			for (const node of graph.model.getNodes()) {
				if (!(node instanceof GraphInstanceGraphNode) || node.getGraphId() !== graphId) continue
				const value = node.getInputValue(inputId)
				if (value !== undefined && (!input || !this.document.isInputValueCompatible(input, value))) {
					node.removeInputValue(inputId)
				}
			}
		}
	}

	private reconcileEnumOptionReferences(
		enumId: string,
		previousOption?: string,
		nextOption?: string
	): void {
		for (const graph of this.document.getGraphs()) {
			for (const input of graph.inputs) {
				if (input.valueType !== 'enum' || input.enumId !== enumId) continue
				for (const containingGraph of this.document.getGraphs()) {
					for (const node of containingGraph.model.getNodes()) {
						if (!(node instanceof GraphInstanceGraphNode) || node.getGraphId() !== graph.id) {
							continue
						}
						const value = node.getInputValue(input.id)
						if (previousOption && nextOption && value === previousOption) {
							node.setInputValue(input.id, nextOption)
						} else if (
							value !== undefined
							&& !this.document.isInputValueCompatible(input, value)
						) {
							node.removeInputValue(input.id)
						}
					}
				}
				this.reconcileEnumMappingsForInput(
					graph.id,
					input.id,
					previousOption,
					nextOption
				)
			}
		}
	}

	private reconcileEnumMappingsForInput(
		graphId: string,
		inputId: string,
		previousOption?: string,
		nextOption?: string
	): void {
		const graph = this.document.requireGraph(graphId)
		const input = graph.inputs.find((candidate) => candidate.id === inputId)
		if (input?.valueType !== 'enum') return
		const options = this.document.getInputOptions(input)
		const boundary = graph.model.getNodes().find(
			(node) => node instanceof GraphInputGraphNode && node.getInputId() === inputId
		)
		if (!boundary) return
		for (const edge of graph.model.getEdges()) {
			if (edge.sourceNodeId !== boundary.id || edge.sourcePort !== inputId) continue
			const target = graph.model.getNode(edge.targetNodeId)
			if (target instanceof MeshSelectorGraphNode) {
				target.setSelections(target.getSelections().flatMap((selection) => {
					const enumValue = previousOption && nextOption && selection.enumValue === previousOption
						? nextOption
						: selection.enumValue
					return options.includes(enumValue) ? [{ ...selection, enumValue }] : []
				}))
			}
			if (target instanceof EnumNumberMapGraphNode) {
				target.setMappings(target.getMappings().flatMap((mapping) => {
					const enumValue = previousOption && nextOption && mapping.enumValue === previousOption
						? nextOption
						: mapping.enumValue
					return options.includes(enumValue) ? [{ ...mapping, enumValue }] : []
				}))
			}
		}
	}

	private execute(
		label: string,
		mutation: () => void,
		mergeKey?: string,
		affectsEvaluation = true
	): void {
		try {
			const changed = this.history.execute(
				this.commandFactory.mutate(label, mutation, mergeKey)
			)
			if (!changed) return
			this.state.publish(affectsEvaluation)
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
			`Active root graph: "${snapshot.activeRootGraphId}".`,
			`Document version: ${snapshot.documentVersion}.`,
			`Undo available: ${this.history.canUndo()}.`,
			`Redo available: ${this.history.canRedo()}.`,
			describeError(cause),
		].join(' ')
		console.error(error, {
			cause,
			action,
			activeGraphId: snapshot.activeGraphId,
			activeRootGraphId: snapshot.activeRootGraphId,
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
			getEnumOptions: (enumId: string) => this.document.getEnumOptions(enumId),
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

	private createEnumDefinition(): string {
		let sequence = 1
		while (this.document.getEnumDefinition(`enum-${sequence}`)) sequence += 1
		const enumId = `enum-${sequence}`
		this.document.addEnumDefinition({
			id: enumId,
			name: `Choice ${sequence}`,
			options: ['Option'],
		})
		return enumId
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
	valueType: GraphInputDefinition['valueType'],
	enumId?: string
): GraphInputDefinition {
	if (valueType === 'number') {
		return { id, label: 'Number', valueType, defaultValue: 1 }
	}
	if (valueType === 'numberArray') {
		return { id, label: 'Number array', valueType, defaultValue: [1, 1] }
	}
	if (valueType === 'enum') {
		if (!enumId) throw new Error(`Cannot create choice graph input "${id}" without a choice-set ID.`)
		return {
			id,
			label: 'Choice',
			valueType,
			enumId,
			defaultValue: 'Option',
		}
	}
	if (valueType === 'color') {
		return {
			id,
			label: 'Color',
			valueType,
			defaultValue: defaultMaterialColor,
		}
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
