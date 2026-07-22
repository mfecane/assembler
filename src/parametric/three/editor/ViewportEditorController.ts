import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import type { GraphController } from '@/parametric/controller/GraphController'
import type { EvaluatedAssetSource } from '@/parametric/evaluation/EvaluationTypes'
import { TransformGraphNode } from '@/parametric/model/GraphNode'
import type { ViewportReactBridge } from '@/parametric/three/editor/ViewportReactBridge'
import {
	EditorCommandFactory,
	HistoryController,
	type TransformNodeValues,
} from '@/parametric/three/editor/EditorCommands'
import {
	InteractionHandlerRouter,
	MeshSelectionInteractionHandler,
} from '@/parametric/three/editor/InteractionSystem'

export class ViewportEditorController {
	public readonly history = new HistoryController()
	public readonly commandFactory: EditorCommandFactory
	public readonly interactions = new InteractionHandlerRouter()
	private activeGraphId: string

	public constructor(
		private readonly graphController: GraphController,
		private readonly bridge: ViewportReactBridge,
		private readonly requestRenderSync: () => void
	) {
		this.activeGraphId = graphController.getSnapshot().activeGraphId
		this.commandFactory = new EditorCommandFactory(graphController)
		this.interactions.add(new MeshSelectionInteractionHandler(this))
	}

	public openNode(nodeId: string): void {
		const snapshot = this.graphController.getSnapshot()
		const node = snapshot.model.getNode(nodeId)
		if (!node) return
		this.bridge.update({
			previewNodeId: nodeId,
			transformNodeId: node instanceof TransformGraphNode ? nodeId : null,
			selectedMeshInstanceId: null,
			contextMenu: null,
		})
		this.requestRenderSync()
	}

	public showGraphOutput(): void {
		this.bridge.update({
			previewNodeId: null,
			transformNodeId: null,
			selectedMeshInstanceId: null,
			contextMenu: null,
		})
		this.requestRenderSync()
	}

	public setTransformMode(mode: TransformControlsMode): void {
		this.bridge.update({ transformMode: mode })
		this.requestRenderSync()
	}

	public isTransformModeActive(): boolean {
		return this.bridge.getSnapshot().transformNodeId !== null
	}

	public selectMesh(
		meshInstanceId: string,
		assetSource: EvaluatedAssetSource,
		x: number,
		y: number
	): void {
		this.bridge.update({
			selectedMeshInstanceId: meshInstanceId,
			contextMenu: { x, y, meshInstanceId, assetSource },
		})
		this.requestRenderSync()
	}

	public clearMeshSelection(): void {
		if (!this.bridge.getSnapshot().selectedMeshInstanceId) return
		this.bridge.update({ selectedMeshInstanceId: null, contextMenu: null })
		this.requestRenderSync()
	}

	public goToOriginalAssetNode(): void {
		const source = this.bridge.getSnapshot().contextMenu?.assetSource
		if (!source) return
		this.graphController.openGraph(source.graphId)
		this.bridge.update({
			previewNodeId: null,
			transformNodeId: null,
			selectedMeshInstanceId: null,
			contextMenu: null,
			graphNodeFocusRequest: source,
		})
		this.requestRenderSync()
	}

	public acknowledgeGraphNodeFocus(): void {
		if (this.bridge.getSnapshot().graphNodeFocusRequest) {
			this.bridge.update({ graphNodeFocusRequest: null })
		}
	}

	public applyTransform(
		nodeId: string,
		before: TransformNodeValues,
		after: TransformNodeValues
	): void {
		const graphSnapshot = this.graphController.getSnapshot()
		const graphId = graphSnapshot.activeGraphId
		const node = graphSnapshot.model.getNode(nodeId)
		const normalizedAfter = node instanceof TransformGraphNode && node.getUniformScale()
			? {
				...after,
				scale: (() => {
					const changedAxis = (['x', 'y', 'z'] as const).find(
						(axis) => after.scale[axis] !== before.scale[axis]
					)
					const value = changedAxis ? after.scale[changedAxis] : after.scale.x
					return { x: value, y: value, z: value }
				})(),
			}
			: after
		this.history.execute(this.commandFactory.setTransformNode(
			graphId,
			nodeId,
			before,
			normalizedAfter
		))
	}

	public handleGraphChange(): void {
		const bridgeSnapshot = this.bridge.getSnapshot()
		const graphSnapshot = this.graphController.getSnapshot()
		if (graphSnapshot.activeGraphId !== this.activeGraphId) {
			this.activeGraphId = graphSnapshot.activeGraphId
			this.bridge.update({
				previewNodeId: null,
				transformNodeId: null,
				selectedMeshInstanceId: null,
				contextMenu: null,
			})
			this.requestRenderSync()
			return
		}
		const previewExists = bridgeSnapshot.previewNodeId
			? Boolean(graphSnapshot.model.getNode(bridgeSnapshot.previewNodeId))
			: true
		const transformExists = bridgeSnapshot.transformNodeId
			? graphSnapshot.model.getNode(bridgeSnapshot.transformNodeId) instanceof TransformGraphNode
			: true
		if (!previewExists || !transformExists) {
			this.bridge.update({
				previewNodeId: previewExists ? bridgeSnapshot.previewNodeId : null,
				transformNodeId: transformExists ? bridgeSnapshot.transformNodeId : null,
				selectedMeshInstanceId: null,
				contextMenu: null,
			})
		}
		this.requestRenderSync()
	}
}
