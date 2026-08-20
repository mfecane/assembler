import {
	GraphEdge,
	supportsVectorComponentInterop,
	type VectorComponent,
} from '@/parametric/model/GraphEdge'
import { GraphState, type GraphStateSnapshot } from '@/parametric/editor/GraphState'
import { ReactBridge } from '@/parametric/editor/ReactBridge'
import { CommandFactory } from '@/parametric/editor/commands/CommandFactory'
import { HistoryController } from '@/parametric/editor/commands/HistoryController'
import { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import {
	type ConfigurationPanelControl,
	GraphDocumentModel,
	remapMovedIndex,
	type GraphInputDefinition,
	type GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import { GraphModel } from '@/parametric/model/GraphModel'
import {
	ArrayGraphNode,
	ChoiceToBooleanMapGraphNode,
	type ChoiceBooleanMapping,
	ChoiceToScalarMapGraphNode,
	type ChoiceScalarMapping,
	ChoiceToVector3MapGraphNode,
	type ChoiceVector3Mapping,
	type ChoiceMeshMapping,
	ChoiceToMeshMapGraphNode,
	GraphInstanceGraphNode,
	InputGraphNode,
	InputReferenceGraphNode,
	MeshAssetGraphNode,
	StretchableAssetGraphNode,
	OutputGraphNode,
	PinGraphNode,
	TransformGraphNode,
	type Axis,
	type GraphNode,
	type GraphPoint,
	isTransformableGraphNode,
} from '@/parametric/model/GraphNode'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import {
	deserializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { MeshCatalog, MeshDescriptor } from '@/parametric/model/MeshCatalog'
import type { MaterialCatalog } from '@/parametric/model/MaterialCatalog'
import type { CreatableNodeDefinition, NodeRegistry } from '@/parametric/model/NodeDefinition'
import { StretchableAssetMetadata } from '@/parametric/model/StretchableAssetMetadata'
import { LayoutEvaluator } from '@/layout/LayoutEvaluator'
import type { LayoutInstanceBoundsDocument, LayoutRangeDocument } from '@/layout/LayoutDocument'
import type { LayoutAxisRole, RootGraphAxisBinding } from '@/layout/GraphLayoutMetadata'

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

export interface SelectableMeshDescriptor extends MeshDescriptor {
	stretchable: boolean
}

export class EditorController {
	public readonly history = new HistoryController()
	private readonly state: GraphState
	private readonly commandFactory: CommandFactory
	private readonly evaluator: GraphEvaluator
	private readonly layoutEvaluator: LayoutEvaluator

	public constructor(
		document: GraphDocumentModel,
		private readonly nodeRegistry: NodeRegistry,
		private readonly meshCatalog: MeshCatalog,
		private readonly materialCatalog: MaterialCatalog,
		private readonly bridge: ReactBridge
	) {
		this.state = new GraphState(document, nodeRegistry)
		this.commandFactory = new CommandFactory(this.state)
		this.evaluator = new GraphEvaluator(nodeRegistry, meshCatalog)
		this.layoutEvaluator = new LayoutEvaluator(this.evaluator)
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
			() => {
				const node = this.activeModel.getNode(nodeId)
				node?.setName(normalizedName)
				if (node instanceof InputGraphNode && node.isExported()) {
					this.document.updateInput(this.activeGraphId, node.id, { label: normalizedName })
				}
			}
		)
	}

	public addNode(type: string, position: GraphPoint, selectedEdgeId?: string): void {
		this.execute(`Add ${type} node`, () => {
			const id = this.createNodeId(type)
			const node = this.nodeRegistry.create(type, id, position, {
				meshCatalog: this.meshCatalog,
				materialCatalog: this.materialCatalog,
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

	public addStretchableAsset(meshId: string, position: GraphPoint): void {
		const metadata = this.requireStretchableAssetMetadata(
			meshId,
			`add Stretchable Asset node to graph "${this.activeGraphId}"`
		)
		this.execute(`Add stretchable asset "${meshId}"`, () => {
			const id = this.createNodeId('stretchableAsset')
			const node = new StretchableAssetGraphNode(id, position, meshId, metadata.naturalSize)
			node.setName('Stretchable Asset')
			this.activeModel.addNode(node)
		})
	}

	public setStretchableAssetMesh(nodeId: string, meshId: string): void {
		const node = this.activeModel.getNode(nodeId)
		if (!(node instanceof StretchableAssetGraphNode)) return
		const metadata = this.requireStretchableAssetMetadata(
			meshId,
			`select mesh for Stretchable Asset node "${nodeId}" in graph "${this.activeGraphId}"`
		)
		this.execute(`Set mesh on Stretchable Asset node "${nodeId}" to "${meshId}"`, () => {
			node.setMesh(meshId, metadata.naturalSize)
			const allowedPorts = new Set(metadata.stretchAxes.map((stretchAxis) => (
				`stretch${stretchAxis.axis.toUpperCase()}`
			)))
			for (const edge of this.activeModel.getEdges()) {
				if (edge.targetNodeId === nodeId && edge.targetPort?.startsWith('stretch')
					&& !allowedPorts.has(edge.targetPort)) {
					this.activeModel.removeEdge(edge.id)
				}
			}
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

	public addGraph(label: string): void {
		this.addGraphDefinition(false, label)
	}

	public addRootGraph(label: string): void {
		this.addGraphDefinition(true, label)
	}

	public copyGraph(graphId: string): void {
		const sourceLabel = this.document.getGraph(graphId)?.label ?? graphId
		this.execute(`Copy assembly "${sourceLabel}"`, () => {
			const source = this.document.getGraph(graphId)
			if (!source) {
				throw new Error(
					`Cannot copy assembly "${graphId}": no graph with that ID exists in the current document. `
					+ `Available graph IDs: ${JSON.stringify(
						this.document.getGraphs().map((graph) => graph.id)
					)}.`
				)
			}
			const copyId = this.createGraphId()
			const nodes = source.model.getNodes().map((sourceNode) => {
				const node = this.nodeRegistry.deserialize(
					sourceNode.type,
					sourceNode.id,
					sourceNode.getPosition(),
					this.nodeRegistry.serialize(sourceNode)
				)
				node.setName(sourceNode.getName())
				return node
			})
			const model = new GraphModel(this.nodeRegistry, nodes)
			this.document.addGraph({
				id: copyId,
				label: this.createGraphCopyLabel(source.label),
				inputs: source.inputs.map((input) => ({
					...input,
					defaultValue: Array.isArray(input.defaultValue)
						? [...input.defaultValue]
						: input.defaultValue,
				})),
				output: { ...source.output },
				model,
			})
			model.setPortContext({
				containingGraphId: copyId,
				getGraphInterface: (referencedGraphId) => (
					this.document.getGraphInterface(referencedGraphId)
				),
				getEnumOptions: (enumId) => this.document.getEnumOptions(enumId),
			})
			const sourceEdges = source.model.getEdges()
			for (const edge of sourceEdges) {
				model.connect(new GraphEdge(
					edge.id,
					edge.sourceNodeId,
					edge.targetNodeId,
					edge.sourcePort,
					edge.targetPort
				))
			}
			if (model.getEdges().length !== sourceEdges.length) {
				throw new Error(
					`Cannot copy assembly "${source.label}" (${source.id}) to "${copyId}": `
					+ `only ${model.getEdges().length} of ${sourceEdges.length} connections were valid `
					+ 'after cloning its nodes and interface.'
				)
			}
			if (this.document.isRootGraph(source.id)) {
				this.document.addRootGraph(copyId)
				this.document.setConfigurationControls(
					copyId,
					this.document.getConfigurationControls(source.id)
				)
				for (const [inputId, value] of Object.entries(
					this.document.getRootInputValues(source.id)
				)) {
					if (!this.document.setRootInputValue(copyId, inputId, value)) {
						throw new Error(
							`Cannot copy root assembly "${source.label}" (${source.id}) to "${copyId}": `
							+ `root input "${inputId}" rejected its copied value ${JSON.stringify(value)}.`
						)
					}
				}
				this.state.openGraph(copyId, copyId)
				return
			}
			this.state.openGraph(copyId)
		})
	}

	private addGraphDefinition(root: boolean, label: string): void {
		const normalizedLabel = label.trim()
		if (!normalizedLabel) {
			throw new Error(`Cannot add ${root ? 'a root' : 'an'} assembly without a name.`)
		}
		this.execute(`Add ${root ? 'root' : 'reusable'} assembly "${normalizedLabel}"`, () => {
			const id = this.createGraphId()
			const outputNode = new OutputGraphNode(`${id}-output`, { x: 500, y: 120 })
			outputNode.setName('Assembly Output')
			const model = new GraphModel(
				this.nodeRegistry,
				[outputNode]
			)
			this.document.addGraph({
				id,
				label: normalizedLabel,
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
				: valueType === 'vector3'
					? 'vector 3'
					: valueType
		this.execute(`Add ${displayedType} input`, () => {
			const inputId = this.createNodeId('input')
			const enumId = valueType === 'enum' ? this.createEnumDefinition() : undefined
			const input = createInputDefinition(inputId, valueType, enumId)
			const node = new InputGraphNode(
				inputId,
				position,
				valueType,
				input.defaultValue,
				false,
				enumId
			)
			node.setName(input.label)
			this.activeModel.addNode(node)
		})
	}

	public addInputReference(inputId: string, position: GraphPoint): void {
		const input = this.document.getGraph(this.activeGraphId)?.inputs.find(
			(candidate) => candidate.id === inputId
		)
		if (!input) {
			throw new Error(
				`Cannot add Input Reference node in graph "${this.activeGraphId}": graph input "${inputId}" `
				+ `does not exist. Available input IDs: ${JSON.stringify(
					this.document.requireGraph(this.activeGraphId).inputs.map((candidate) => candidate.id)
				)}.`
			)
		}
		this.execute(`Add input reference "${inputId}"`, () => {
			const node = new InputReferenceGraphNode(this.createNodeId('inputReference'), position, inputId)
			node.setName(input.label)
			this.activeModel.addNode(node)
		})
	}

	public setInputReferenceInput(nodeId: string, inputId: string): void {
		const node = this.activeModel.getNode(nodeId)
		if (!(node instanceof InputReferenceGraphNode) || node.getInputId() === inputId) return
		const input = this.document.getGraph(this.activeGraphId)?.inputs.find(
			(candidate) => candidate.id === inputId
		)
		if (!input) return
		this.execute(`Set input reference "${nodeId}" to "${inputId}"`, () => {
			node.setInputId(inputId)
			for (const edge of this.activeModel.getEdges()) {
				if (edge.sourceNodeId === node.id) this.activeModel.removeEdge(edge.id)
			}
		})
	}

	public updateGraphInput(
		inputId: string,
		update: Partial<Omit<GraphInputDefinition, 'id' | 'valueType'>>
	): void {
		const node = this.activeModel.getNode(inputId)
		if (!(node instanceof InputGraphNode)) return
		this.execute(
			`Update input "${inputId}"`,
			() => {
				if (update.defaultValue !== undefined) node.setValue(update.defaultValue)
				if (update.label !== undefined) node.setName(update.label)
				if (node.isExported()) {
					this.document.updateInput(this.activeGraphId, inputId, update)
					this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
				}
			},
			`graph-input:${this.activeGraphId}:${inputId}`
		)
	}

	public setGraphInputEnum(inputId: string, enumId: string): void {
		const node = this.activeModel.getNode(inputId)
		if (!(node instanceof InputGraphNode) || node.getValueType() !== 'enum' || node.getEnumId() === enumId) return
		this.execute(`Use choice set "${enumId}" for graph input "${inputId}"`, () => {
			const previousEnumId = node.getEnumId()
			node.setEnumId(enumId)
			const value = node.getValue()
			if (typeof value !== 'number' || value >= this.document.getEnumOptions(enumId).length) {
				node.setValue(0)
			}
			if (node.isExported()) {
				this.document.setInputEnum(this.activeGraphId, inputId, enumId)
				this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
			}
			this.reconcileEnumMappingsForInput(this.activeGraphId, inputId)
			if (previousEnumId) this.document.removeEnumIfUnused(previousEnumId)
		})
	}

	public createEnumForGraphInput(inputId: string): void {
		const node = this.activeModel.getNode(inputId)
		if (!(node instanceof InputGraphNode) || node.getValueType() !== 'enum') return
		this.execute(`Create choice set for graph input "${inputId}"`, () => {
			const previousEnumId = node.getEnumId()
			const enumId = this.createEnumDefinition()
			node.setEnumId(enumId)
			node.setValue(0)
			if (node.isExported()) {
				this.document.setInputEnum(this.activeGraphId, inputId, enumId)
				this.reconcileGraphInstanceInputValues(this.activeGraphId, inputId)
			}
			this.reconcileEnumMappingsForInput(this.activeGraphId, inputId)
			if (previousEnumId) this.document.removeEnumIfUnused(previousEnumId)
		})
	}

	public setInputExported(nodeId: string, exported: boolean): void {
		const node = this.activeModel.getNode(nodeId)
		if (!(node instanceof InputGraphNode) || node.isExported() === exported) return
		this.execute(`${exported ? 'Export' : 'Localize'} input "${nodeId}"`, () => {
			if (exported) {
				const definition = createInputDefinition(node.id, node.getValueType(), node.getEnumId())
				definition.label = node.getName()
				definition.defaultValue = node.getValue()
				if (!this.document.addInput(this.activeGraphId, definition)) {
					throw new Error(`Cannot export input node "${nodeId}": graph input ID already exists.`)
				}
				node.setExported(true)
				return
			}
			this.removeGraphInputFromGraph(this.activeGraphId, nodeId)
			node.setExported(false)
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
			this.reconcileEnumOptionReferences(enumId)
		})
	}

	public renameEnumOption(enumId: string, index: number, option: string): void {
		this.execute(`Rename choice ${index + 1} in choice set "${enumId}"`, () => {
			this.document.renameEnumOption(enumId, index, option)
		})
	}

	public removeEnumOption(enumId: string, index: number): void {
		this.execute(`Remove choice ${index + 1} from choice set "${enumId}"`, () => {
			this.document.removeEnumOption(enumId, index)
			this.reconcileEnumOptionReferences(
				enumId,
				(value) => value === index ? undefined : value > index ? value - 1 : value
			)
		})
	}

	public moveEnumOption(enumId: string, sourceIndex: number, targetIndex: number): void {
		if (sourceIndex === targetIndex) return
		this.execute(
			`Move choice ${sourceIndex + 1} to position ${targetIndex + 1} in choice set "${enumId}"`,
			() => {
				this.document.moveEnumOption(enumId, sourceIndex, targetIndex)
				this.reconcileEnumOptionReferences(
					enumId,
					(value) => remapMovedIndex(value, sourceIndex, targetIndex)
				)
			},
			`enum-options:${enumId}`
		)
	}

	public removeGraphInput(inputId: string): void {
		this.setInputExported(inputId, false)
	}

	private removeGraphInputFromGraph(graphId: string, inputId: string): boolean {
		const graph = this.document.requireGraph(graphId)
		for (const node of graph.model.getNodes()) {
			if (node instanceof InputReferenceGraphNode && node.getInputId() === inputId) {
				graph.model.removeNode(node.id)
			}
		}
		if (!this.document.removeInput(graph.id, inputId)) return false
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

	public getSelectableMeshes(): SelectableMeshDescriptor[] {
		return this.meshCatalog
			.getMeshes()
			.filter((mesh) => mesh.selectable)
			.map((mesh) => ({ ...mesh, stretchable: this.isMeshStretchable(mesh.id) }))
	}

	public getStretchableAssetAxes(meshId: string): Axis[] {
		const bounds = this.meshCatalog.getBounds(meshId)
		if (!bounds) return []
		return new StretchableAssetMetadata(
			meshId,
			bounds,
			this.meshCatalog.getMetadata(meshId) ?? {}
		).stretchAxes.map((stretchAxis) => stretchAxis.axis)
	}

	public createMeshPreviewGeometry(meshId: string) {
		return this.meshCatalog.createGeometry(meshId)
	}

	public removeNode(nodeId: string): void {
		this.execute(
			`Remove node "${nodeId}"`,
			() => this.removeNodeFromActiveGraph(nodeId)
		)
	}

	public removeGraphElements(
		nodeIds: readonly string[],
		edgeIds: readonly string[]
	): void {
		const removableNodeIds = [...new Set(nodeIds)].filter(
			(nodeId) => this.activeModel.isNodeRemovable(nodeId)
		)
		const existingEdgeIds = [...new Set(edgeIds)].filter(
			(edgeId) => this.activeModel.getEdges().some((edge) => edge.id === edgeId)
		)
		if (removableNodeIds.length === 0 && existingEdgeIds.length === 0) return

		const elementCount = removableNodeIds.length + existingEdgeIds.length
		this.execute(
			`Remove ${elementCount} selected graph element${elementCount === 1 ? '' : 's'}`,
			() => {
				for (const edgeId of existingEdgeIds) this.activeModel.removeEdge(edgeId)
				for (const nodeId of removableNodeIds) this.removeNodeFromActiveGraph(nodeId)
			}
		)
	}

	public canCopyNode(nodeId: string): boolean {
		const node = this.activeModel.getNode(nodeId)
		return Boolean(
			node
			&& !(node instanceof InputGraphNode)
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
			const enumIds = graph.model.getNodes().flatMap((node) => (
				node instanceof InputGraphNode && node.getEnumId() ? [node.getEnumId() as string] : []
			))
			for (const input of [...graph.inputs]) {
				this.removeGraphInputFromGraph(graph.id, input.id)
			}
			this.activeModel.clearExceptOutput()
			for (const enumId of enumIds) this.document.removeEnumIfUnused(enumId)
		})
	}

	public connect(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null,
		component?: VectorComponent
	): void {
		this.execute(`Connect "${sourceNodeId}" to "${targetNodeId}"`, () => {
			const id = this.createEdgeId(sourceNodeId, targetNodeId, sourcePort, targetPort)
			this.activeModel.connect(
				new GraphEdge(id, sourceNodeId, targetNodeId, sourcePort, targetPort, component)
			)
			if (targetPort === 'enum') {
				const target = this.activeModel.getNode(targetNodeId)
				if (target instanceof ChoiceToMeshMapGraphNode) {
					this.reconcileChoiceMeshMappings(
						this.activeModel,
						target,
						this.activeModel.getInputOptions(targetNodeId, targetPort).length
					)
				}
			}
		})
	}

	public addConnectionPin(
		sourceNodeId: string,
		sourcePortId: string,
		position: GraphPoint
	): void {
		this.execute(`Add pin from "${sourceNodeId}.${sourcePortId}"`, () => {
			const sourceNode = this.activeModel.getNode(sourceNodeId)
			const sourcePort = sourceNode
				? this.nodeRegistry.getOutputPorts(
					sourceNode,
					this.createPortContext(this.activeGraphId)
				).find((port) => port.id === sourcePortId)
				: undefined
			if (!sourceNode || !sourcePort) {
				throw new Error(
					`Cannot add a connection pin in graph "${this.activeGraphId}" from `
					+ `"${sourceNodeId}.${sourcePortId}": the source node or output port does not exist. `
					+ `Available output ports: ${JSON.stringify(
						sourceNode
							? this.nodeRegistry.getOutputPorts(
								sourceNode,
								this.createPortContext(this.activeGraphId)
							).map((port) => port.id)
							: []
					)}.`
				)
			}

			const pinId = this.createNodeId('pin')
			const pin = new PinGraphNode(pinId, position, sourcePort.valueType)
			pin.setName('Pin')
			this.activeModel.addNode(pin)
			this.activeModel.connect(new GraphEdge(
				this.createEdgeId(sourceNodeId, pinId, sourcePortId, 'value'),
				sourceNodeId,
				pinId,
				sourcePortId,
				'value'
			))
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
		) || this.requiresVectorComponent(sourceNodeId, targetNodeId, sourcePort, targetPort)
	}

	public requiresVectorComponent(
		sourceNodeId: string,
		targetNodeId: string,
		sourcePort: string | null,
		targetPort: string | null
	): boolean {
		const sourceNode = this.activeModel.getNode(sourceNodeId)
		const targetNode = this.activeModel.getNode(targetNodeId)
		if (!sourceNode || !targetNode || !sourcePort || !targetPort) return false
		const context = this.createPortContext(this.activeGraphId)
		const sourceType = this.nodeRegistry.getOutputPorts(sourceNode, context)
			.find((port) => port.id === sourcePort)?.valueType
		const targetType = this.nodeRegistry.getInputPorts(targetNode, context)
			.find((port) => port.id === targetPort)?.valueType
		return Boolean(sourceType && targetType && supportsVectorComponentInterop(sourceType, targetType))
	}

	public removeEdge(edgeId: string): void {
		this.execute(`Remove connection "${edgeId}"`, () => this.activeModel.removeEdge(edgeId))
	}

	private removeNodeFromActiveGraph(nodeId: string): void {
		const node = this.activeModel.getNode(nodeId)
		const enumId = node instanceof InputGraphNode ? node.getEnumId() : undefined
		if (node instanceof InputGraphNode && node.isExported()) {
			this.removeGraphInputFromGraph(this.activeGraphId, node.id)
		}
		this.activeModel.removeNode(nodeId)
		if (enumId) this.document.removeEnumIfUnused(enumId)
	}

	public exportGraph(): GraphDocument {
		return this.state.serialize()
	}

	public setActiveProduct(productId: string): void {
		this.execute(
			`Select product "${productId}"`,
			() => this.document.setActiveProduct(productId)
		)
	}

	public addProduct(layoutId: string, label?: string): void {
		const layout = this.document.getLayout()
		const number = layout.products.length + 1
		const productId = `product-${crypto.randomUUID()}`
		const productLabel = label?.trim() || `Product ${number}`
		this.execute(
			`Add product "${productLabel}"`,
			() => this.document.addProduct({
				id: productId,
				label: productLabel,
				layoutId,
				instances: [],
			})
		)
		this.setActiveProduct(productId)
	}

	public setProductLabel(productId: string, label: string): void {
		this.execute(
			`Rename product "${productId}"`,
			() => this.document.setProductLabel(productId, label),
			`product-label:${productId}`
		)
	}

	public removeProduct(productId: string): void {
		this.execute(`Delete product "${productId}"`, () => this.document.removeProduct(productId))
	}

	public setProductLayout(productId: string, layoutId: string): void {
		this.execute(
			`Assign layout "${layoutId}" to product "${productId}"`,
			() => this.document.setProductLayout(productId, layoutId)
		)
	}

	public setLayoutConfigurationHeader(layoutId: string, header: string): void {
		this.execute(
			`Set customer panel heading on product layout "${layoutId}"`,
			() => this.document.setLayoutConfigurationHeader(layoutId, header),
			`layout-configuration-header:${layoutId}`
		)
	}

	public setLayoutSlot(layoutId: string, slotId: string): void {
		this.execute(
			`Assign slot "${slotId}" to product layout "${layoutId}"`,
			() => this.document.setLayoutSlot(layoutId, slotId)
		)
	}

	public addDefaultProductInstance(productId: string): void {
		const instanceId = `layout-instance-${crypto.randomUUID()}`
		this.execute(
			`Add product item "${instanceId}" to product "${productId}"`,
			() => this.document.addDefaultProductInstance(productId, instanceId)
		)
	}

	public removeProductInstance(productId: string, instanceId: string): void {
		this.execute(
			`Remove product item "${instanceId}" from product "${productId}"`,
			() => this.document.removeProductInstance(productId, instanceId)
		)
	}

	public setProductInstanceGraph(
		productId: string,
		instanceId: string,
		graphId: string
	): void {
		this.execute(
			`Set graph "${graphId}" on product item "${instanceId}" in product "${productId}"`,
			() => this.document.setProductInstanceGraph(productId, instanceId, graphId)
		)
	}

	public setProductInstanceInputValue(
		productId: string,
		instanceId: string,
		inputId: string,
		value: GraphInputValue
	): void {
		this.execute(
			`Set input "${inputId}" on product item "${instanceId}" in product "${productId}"`,
			() => this.document.setProductInstanceInputValue(productId, instanceId, inputId, value),
			`product-input:${productId}:${instanceId}:${inputId}`
		)
	}

	public setLayoutSlotGraphs(slotId: string, graphIds: string[]): void {
		this.execute(
			`Set allowed graphs on layout slot definition "${slotId}"`,
			() => this.document.setLayoutSlotGraphs(slotId, graphIds)
		)
	}

	public setLayoutSlotLabel(slotId: string, label: string): void {
		this.execute(
			`Rename slot "${slotId}"`,
			() => this.document.setLayoutSlotLabel(slotId, label),
			`layout-slot-label:${slotId}`
		)
	}

	public addLayoutSlot(label: string): string {
		const slotId = `product-type-${crypto.randomUUID()}`
		this.execute(
			`Add slot "${slotId}"`,
			() => this.document.addLayoutSlot({
				id: slotId,
				label,
				graphs: [],
				instanceBounds: {
					width: { min: 0.6, max: 2 },
					depth: { min: 0.6, max: 2 },
					height: { min: 0.6, max: 2 },
				},
			})
		)
		return slotId
	}

	public removeLayoutSlot(slotId: string): void {
		this.execute(`Remove slot "${slotId}"`, () => this.document.removeLayoutSlot(slotId))
	}

	public setLayoutSlotsCount(layoutId: string, slotsCount: LayoutRangeDocument): void {
		this.execute(
			`Set slot count on product layout "${layoutId}"`,
			() => this.document.setLayoutSlotsCount(layoutId, slotsCount)
		)
	}

	public setLayoutSlotInstanceBounds(
		slotId: string,
		instanceBounds: LayoutInstanceBoundsDocument
	): void {
		this.execute(
			`Set instance bounds on layout slot definition "${slotId}"`,
			() => this.document.setLayoutSlotInstanceBounds(slotId, instanceBounds)
		)
	}

	public setProductInstanceLayoutAxisBinding(
		productId: string,
		instanceId: string,
		role: LayoutAxisRole,
		path: string | null
	): void {
		this.execute(
			`Set layout ${role} axis binding on product item "${instanceId}"`,
			() => this.document.setProductInstanceLayoutAxisBinding(productId, instanceId, role, path)
		)
	}

	public setRootGraphLayoutAxisBinding(
		graphId: string,
		role: LayoutAxisRole,
		binding: RootGraphAxisBinding | null
	): void {
		this.execute(
			`Set layout ${role} axis binding on root graph "${graphId}"`,
			() => this.document.setRootGraphLayoutAxisBinding(graphId, role, binding)
		)
	}

	public importGraph(value: unknown): void {
		let document: GraphDocumentModel
		try {
			document = deserializeGraph(value, this.nodeRegistry)
		} catch (cause) {
			this.reportCommandError('validate graph document import', cause)
			throw cause
		}
		const currentClient = this.state.getDocument().getClient()
		if (document.getClient() !== currentClient) {
			const error = new Error(
				`Cannot import a ${document.getClient()} document into a ${currentClient} project. `
				+ 'Create or open a project for the target client instead.'
			)
			this.reportCommandError('validate graph document client', error)
			throw error
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

	public setChoiceScalarMappings(nodeId: string, mappings: ChoiceScalarMapping[]): void {
		this.updateNode<ChoiceToScalarMapGraphNode>(
			nodeId,
			'choiceToScalarMap',
			`Set scalar mappings on node "${nodeId}"`,
			(node) => node.setMappings(mappings)
		)
	}

	public setChoiceBooleanMappings(nodeId: string, mappings: ChoiceBooleanMapping[]): void {
		this.updateNode<ChoiceToBooleanMapGraphNode>(
			nodeId,
			'choiceToBooleanMap',
			`Set boolean mappings on node "${nodeId}"`,
			(node) => node.setMappings(mappings)
		)
	}

	public setChoiceVector3Mappings(nodeId: string, mappings: ChoiceVector3Mapping[]): void {
		this.updateNode<ChoiceToVector3MapGraphNode>(
			nodeId,
			'choiceToVector3Map',
			`Set vector mappings on node "${nodeId}"`,
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
		historyGroup: string,
		precision: boolean
	): void {
		const node = this.document.getGraph(graphId)?.model.getNode(nodeId)
		if (!(node instanceof ArrayGraphNode) || !Number.isFinite(value)) return
		const snap = precision ? ARRAY_DISTANCE_SNAP / 10 : ARRAY_DISTANCE_SNAP
		const snappedValue = Number(
			(Math.round(value / snap) * snap).toFixed(precision ? 3 : 2)
		)
		this.execute(
			`Set duplication distance on array node "${nodeId}" in 3D editor`,
			() => node.setOffset('x', snappedValue),
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

	public createConfigurationTemplate(rootGraphId: string, label: string): string {
		let templateId = ''
		this.execute(`Create configuration template "${label}" for root graph "${rootGraphId}"`, () => {
			templateId = this.document.createConfigurationTemplate(rootGraphId, label)
		})
		if (!templateId) {
			throw new Error(
				`Failed to create configuration template "${label}" for root graph "${rootGraphId}": `
				+ 'the command completed without returning a template ID.'
			)
		}
		return templateId
	}

	public removeConfigurationTemplate(rootGraphId: string, templateId: string): void {
		this.execute(`Remove configuration template "${templateId}" from root graph "${rootGraphId}"`, () => {
			this.document.removeConfigurationTemplate(rootGraphId, templateId)
		})
	}

	public updateConfigurationTemplate(rootGraphId: string, templateId: string): void {
		this.execute(`Update configuration template "${templateId}" on root graph "${rootGraphId}"`, () => {
			this.document.updateConfigurationTemplate(rootGraphId, templateId)
		})
	}

	public renameConfigurationTemplate(rootGraphId: string, templateId: string, label: string): void {
		this.execute(`Rename configuration template "${templateId}" to "${label}"`, () => {
			this.document.renameConfigurationTemplate(rootGraphId, templateId, label)
		})
	}

	public applyConfigurationTemplate(rootGraphId: string, templateId: string): void {
		this.execute(`Apply configuration template "${templateId}" on root graph "${rootGraphId}"`, () => {
			this.document.applyConfigurationTemplate(rootGraphId, templateId)
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

	public evaluateActiveLayout() {
		return this.layoutEvaluator.evaluate(this.document)
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
		const model = this.state.getActiveModel()
		model.setPortContext(this.createPortContext(this.activeGraphId))
		return model
	}

	private isMeshStretchable(meshId: string): boolean {
		const bounds = this.meshCatalog.getBounds(meshId)
		if (!bounds) return false
		return new StretchableAssetMetadata(
			meshId,
			bounds,
			this.meshCatalog.getMetadata(meshId) ?? {}
		).isStretchable()
	}

	private requireStretchableAssetMetadata(
		meshId: string,
		action: string
	): StretchableAssetMetadata {
		const mesh = this.meshCatalog.getMeshes().find(
			(candidate) => candidate.id === meshId && candidate.selectable
		)
		const bounds = this.meshCatalog.getBounds(meshId)
		if (!mesh || !bounds) {
			throw new Error(
				`Cannot ${action}: mesh "${meshId}" is not selectable or has no computed bounds.`
			)
		}
		const metadata = new StretchableAssetMetadata(
			meshId,
			bounds,
			this.meshCatalog.getMetadata(meshId) ?? {}
		)
		if (!metadata.isStretchable()) {
			throw new Error(
				`Cannot ${action}: mesh "${meshId}" has no enabled stretch axes in its model metadata.`
			)
		}
		return metadata
	}

	private createPortContext(graphId: string) {
		return {
			containingGraphId: graphId,
			getGraphInterface: (referencedGraphId: string) => (
				this.document.getGraphInterface(referencedGraphId)
			),
			getEnumOptions: (enumId: string) => this.document.getEnumOptions(enumId),
			getStretchableAxes: (meshId: string) => this.getStretchableAssetAxes(meshId),
		}
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
		remapIndex?: (value: number) => number | undefined
	): void {
		for (const graph of this.document.getGraphs()) {
			for (const inputNode of graph.model.getNodes()) {
				if (
					!(inputNode instanceof InputGraphNode)
					|| inputNode.getValueType() !== 'enum'
					|| inputNode.getEnumId() !== enumId
				) continue
				const input = graph.inputs.find((candidate) => candidate.id === inputNode.id)
				if (!input) {
					this.reconcileEnumMappingsForInput(graph.id, inputNode.id, remapIndex)
					continue
				}
				for (const containingGraph of this.document.getGraphs()) {
					for (const node of containingGraph.model.getNodes()) {
						if (!(node instanceof GraphInstanceGraphNode) || node.getGraphId() !== graph.id) {
							continue
						}
						const value = node.getInputValue(input.id)
						if (typeof value === 'number' && remapIndex) {
							const nextValue = remapIndex(value)
							if (nextValue === undefined) node.removeInputValue(input.id)
							else node.setInputValue(input.id, nextValue)
						} else if (
							value !== undefined
							&& !this.document.isInputValueCompatible(input, value)
						) {
							node.removeInputValue(input.id)
						}
					}
				}
				this.reconcileEnumMappingsForInput(graph.id, input.id, remapIndex)
			}
		}
	}

	private reconcileEnumMappingsForInput(
		graphId: string,
		inputId: string,
		remapIndex?: (value: number) => number | undefined
	): void {
		const graph = this.document.requireGraph(graphId)
		const boundary = graph.model.getNode(inputId)
		if (
			!(boundary instanceof InputGraphNode)
			|| boundary.getValueType() !== 'enum'
			|| !boundary.getEnumId()
		) return
		const optionCount = this.document.getEnumOptions(boundary.getEnumId() as string).length
		for (const edge of graph.model.getEdges()) {
			if (edge.sourceNodeId !== boundary.id || edge.sourcePort !== 'value') continue
			const target = graph.model.getNode(edge.targetNodeId)
			if (target instanceof ChoiceToScalarMapGraphNode) {
				target.setMappings(target.getMappings().flatMap((mapping) => {
					const enumIndex = remapIndex ? remapIndex(mapping.enumIndex) : mapping.enumIndex
					if (enumIndex === undefined) return []
					return enumIndex >= 0 && enumIndex < optionCount ? [{ ...mapping, enumIndex }] : []
				}))
			}
			if (target instanceof ChoiceToBooleanMapGraphNode) {
				target.setMappings(target.getMappings().flatMap((mapping) => {
					const enumIndex = remapIndex ? remapIndex(mapping.enumIndex) : mapping.enumIndex
					if (enumIndex === undefined) return []
					return enumIndex >= 0 && enumIndex < optionCount ? [{ ...mapping, enumIndex }] : []
				}))
			}
			if (target instanceof ChoiceToVector3MapGraphNode) {
				target.setMappings(target.getMappings().flatMap((mapping) => {
					const enumIndex = remapIndex ? remapIndex(mapping.enumIndex) : mapping.enumIndex
					if (enumIndex === undefined) return []
					return enumIndex >= 0 && enumIndex < optionCount ? [{ ...mapping, enumIndex }] : []
				}))
			}
			if (target instanceof ChoiceToMeshMapGraphNode && edge.targetPort === 'enum') {
				this.reconcileChoiceMeshMappings(graph.model, target, optionCount, remapIndex)
			}
		}
	}

	private reconcileChoiceMeshMappings(
		model: GraphModel,
		node: ChoiceToMeshMapGraphNode,
		optionCount: number,
		remapIndex?: (value: number) => number | undefined
	): void {
		if (optionCount === 0) return
		const existingMappings = node.getMappings().flatMap((mapping) => {
			const enumIndex = remapIndex ? remapIndex(mapping.enumIndex) : mapping.enumIndex
			if (enumIndex === undefined) return []
			return enumIndex >= 0 && enumIndex < optionCount ? [{ ...mapping, enumIndex }] : []
		})
		const usedMappingIds = new Set<string>()
		const reservedInputIds = new Set(existingMappings.map((mapping) => mapping.id))
		let inputSequence = 1
		const createInputId = () => {
			while (reservedInputIds.has(`mesh-${inputSequence}`)) inputSequence += 1
			const inputId = `mesh-${inputSequence}`
			reservedInputIds.add(inputId)
			inputSequence += 1
			return inputId
		}
		const mappings = Array.from({ length: optionCount }, (_, enumIndex) => {
			const mapping = existingMappings.find((candidate) => (
				candidate.enumIndex === enumIndex && !usedMappingIds.has(candidate.id)
			))
			if (!mapping) return { id: createInputId(), enumIndex }
			usedMappingIds.add(mapping.id)
			return { id: mapping.id, enumIndex }
		})
		this.applyChoiceMeshMappings(model, node, mappings)
	}

	private applyChoiceMeshMappings(
		model: GraphModel,
		node: ChoiceToMeshMapGraphNode,
		mappings: ChoiceMeshMapping[]
	): void {
		node.setMappings(mappings)
		const inputIds = new Set(node.getMappings().map((mapping) => mapping.id))
		for (const edge of model.getEdges()) {
			if (
				edge.targetNodeId === node.id
				&& edge.targetPort !== 'enum'
				&& !inputIds.has(edge.targetPort ?? '')
			) model.removeEdge(edge.id)
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

	private createGraphCopyLabel(sourceLabel: string): string {
		const labels = new Set(this.document.getGraphs().map((graph) => graph.label))
		const baseLabel = `${sourceLabel} copy`
		if (!labels.has(baseLabel)) return baseLabel
		let sequence = 2
		while (labels.has(`${baseLabel} ${sequence}`)) sequence += 1
		return `${baseLabel} ${sequence}`
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
	if (valueType === 'vector3') {
		return { id, label: 'Vector 3', valueType, defaultValue: { x: 0, y: 0, z: 0 } }
	}
	if (valueType === 'enum') {
		if (!enumId) throw new Error(`Cannot create choice graph input "${id}" without a choice-set ID.`)
		return {
			id,
			label: 'Choice',
			valueType,
			enumId,
			defaultValue: 0,
		}
	}
	if (valueType === 'materialInstance') {
		return { id, label: 'Material', valueType, defaultValue: 'wood' }
	}
	if (valueType === 'color') {
		return { id, label: 'Color', valueType, defaultValue: '#ffffff' }
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
