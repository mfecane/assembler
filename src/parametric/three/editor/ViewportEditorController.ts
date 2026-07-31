import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import type {
	EditorController,
	TransformNodeValues,
} from '@/parametric/editor/EditorController'
import type { ReactBridge } from '@/parametric/editor/ReactBridge'
import type { SceneNodeInstanceReference } from '@/parametric/evaluation/SceneMetadata'
import { TransformGraphNode } from '@/parametric/model/GraphNode'
import {
	InteractionHandlerRouter,
	MeshSelectionInteractionHandler,
} from '@/parametric/three/editor/InteractionSystem'

export class ViewportEditorController {
	public readonly interactions = new InteractionHandlerRouter()
	private activeGraphId: string

	public constructor(
		private readonly editorController: EditorController,
		private readonly bridge: ReactBridge,
		private readonly requestRenderSync: () => void
	) {
		this.activeGraphId = editorController.getSnapshot().activeGraphId
		this.interactions.add(new MeshSelectionInteractionHandler(this))
	}

	public openNode(nodeId: string): void {
		const snapshot = this.editorController.getSnapshot()
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
		originNode: SceneNodeInstanceReference,
		x: number,
		y: number
	): void {
		this.bridge.update({
			selectedMeshInstanceId: meshInstanceId,
			contextMenu: { x, y, meshInstanceId, originNode },
		})
		this.requestRenderSync()
	}

	public clearMeshSelection(): void {
		if (!this.bridge.getSnapshot().selectedMeshInstanceId) return
		this.bridge.update({ selectedMeshInstanceId: null, contextMenu: null })
		this.requestRenderSync()
	}

	public goToOriginalAssetNode(): void {
		const source = this.bridge.getSnapshot().contextMenu?.originNode
		if (!source) return
		this.editorController.openGraph(source.graphId)
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
		after: TransformNodeValues,
		historyGroup: string
	): void {
		const graphSnapshot = this.editorController.getSnapshot()
		const graphId = graphSnapshot.activeGraphId
		this.editorController.setTransformNodeValues(
			graphId,
			nodeId,
			before,
			after,
			historyGroup
		)
	}

	public handleGraphChange(): void {
		const bridgeSnapshot = this.bridge.getSnapshot()
		const graphSnapshot = this.editorController.getSnapshot()
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
