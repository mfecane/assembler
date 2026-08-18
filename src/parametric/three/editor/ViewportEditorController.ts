import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import type {
	EditorController,
	TransformNodeValues,
} from '@/parametric/editor/EditorController'
import type { ReactBridge } from '@/parametric/editor/ReactBridge'
import type { SceneNodeInstanceReference } from '@/parametric/evaluation/SceneMetadata'
import { ArrayGraphNode, isTransformableGraphNode } from '@/parametric/model/GraphNode'
import {
	InteractionHandlerRouter,
	AlignmentPointInteractionHandler,
	MeshSelectionInteractionHandler,
} from '@/parametric/three/editor/InteractionSystem'
import {
	calculateAlignedTranslation,
	copyViewportAlignmentRequest,
	type AlignmentMethod,
	type ViewportAlignmentRequest,
	type ViewportBoundsSnapshot,
} from '@/parametric/three/editor/ViewportAlignment'

export class ViewportEditorController {
	public readonly interactions = new InteractionHandlerRouter()
	private activeGraphId: string
	private alignmentSequence = 0

	public constructor(
		private readonly editorController: EditorController,
		private readonly bridge: ReactBridge,
		private readonly requestRenderSync: () => void
	) {
		this.activeGraphId = editorController.getSnapshot().activeGraphId
		this.interactions.add(new AlignmentPointInteractionHandler(this))
		this.interactions.add(new MeshSelectionInteractionHandler(this))
	}

	public openNode(nodeId: string): void {
		const snapshot = this.editorController.getSnapshot()
		const node = snapshot.model.getNode(nodeId)
		if (!node) return
		this.bridge.update({
			previewNodeId: nodeId,
			transformNodeId: isTransformableGraphNode(node) ? nodeId : null,
			arrayDistanceNodeId: node instanceof ArrayGraphNode ? nodeId : null,
			selectedMeshInstanceId: null,
			contextMenu: null,
		})
		this.requestRenderSync()
	}

	public showGraphOutput(): void {
		this.bridge.update({
			previewNodeId: null,
			transformNodeId: null,
			arrayDistanceNodeId: null,
			selectedMeshInstanceId: null,
			contextMenu: null,
		})
		this.requestRenderSync()
	}

	public setTransformMode(mode: TransformControlsMode): void {
		this.bridge.update({ transformMode: mode })
		this.requestRenderSync()
	}

	public isGizmoActive(): boolean {
		const snapshot = this.bridge.getSnapshot()
		return snapshot.transformNodeId !== null || snapshot.arrayDistanceNodeId !== null
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
			arrayDistanceNodeId: null,
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

	public applyArrayDistance(
		nodeId: string,
		value: number,
		historyGroup: string,
		precision: boolean
	): void {
		const graphId = this.editorController.getSnapshot().activeGraphId
		this.editorController.setArrayDistance(graphId, nodeId, value, historyGroup, precision)
	}

	public alignTransform(
		nodeId: string,
		bounds: ViewportBoundsSnapshot,
		request: ViewportAlignmentRequest
	): void {
		const graphSnapshot = this.editorController.getSnapshot()
		const node = graphSnapshot.model.getNode(nodeId)
		if (!isTransformableGraphNode(node)) {
			throw new Error(
				`Cannot align node "${nodeId}" in graph "${graphSnapshot.activeGraphId}": `
				+ 'the selected node does not have transform capability'
			)
		}
		if (!Object.values(request.enabledAxes).some(Boolean)) {
			throw new Error(`Cannot align node "${nodeId}": enable at least one alignment axis`)
		}
		const transform = node.getTransform()
		const before: TransformNodeValues = {
			translation: transform.getTranslation().toSnapshot(),
			rotation: transform.getRotation().toSnapshot(),
			scale: transform.getScale().toSnapshot(),
		}
		const after: TransformNodeValues = {
			...before,
			translation: calculateAlignedTranslation(before.translation, bounds, request),
		}
		this.alignmentSequence += 1
		this.applyTransform(nodeId, before, after, `alignment-${this.alignmentSequence}`)
	}

	public alignFromGizmo(
		nodeId: string,
		bounds: ViewportBoundsSnapshot,
		methods: Record<'x' | 'y' | 'z', AlignmentMethod>
	): void {
		const request: ViewportAlignmentRequest = {
			enabledAxes: { x: true, y: true, z: true },
			methods,
			point: { x: 0, y: 0, z: 0 },
		}
		try {
			this.alignTransform(nodeId, bounds, request)
			this.bridge.update({
				alignmentSettings: copyViewportAlignmentRequest(request),
				error: null,
			})
			this.requestRenderSync()
		} catch (cause) {
			const error = [
				`Failed to align transform-capable node "${nodeId}" from the 27-point viewport gizmo.`,
				`Active graph: "${this.editorController.getSnapshot().activeGraphId}".`,
				`Alignment methods: ${JSON.stringify(methods)}.`,
				describeAlignmentError(cause),
			].join(' ')
			console.error(error, { cause, nodeId, bounds, request })
			this.bridge.update({ error })
		}
	}

	public handleGraphChange(): void {
		const bridgeSnapshot = this.bridge.getSnapshot()
		const graphSnapshot = this.editorController.getSnapshot()
		if (graphSnapshot.activeGraphId !== this.activeGraphId) {
			this.activeGraphId = graphSnapshot.activeGraphId
			this.bridge.update({
				previewNodeId: null,
				transformNodeId: null,
				arrayDistanceNodeId: null,
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
			? isTransformableGraphNode(
				graphSnapshot.model.getNode(bridgeSnapshot.transformNodeId)
			)
			: true
		const arrayDistanceExists = bridgeSnapshot.arrayDistanceNodeId
			? graphSnapshot.model.getNode(bridgeSnapshot.arrayDistanceNodeId) instanceof ArrayGraphNode
			: true
		if (!previewExists || !transformExists || !arrayDistanceExists) {
			this.bridge.update({
				previewNodeId: previewExists ? bridgeSnapshot.previewNodeId : null,
				transformNodeId: transformExists ? bridgeSnapshot.transformNodeId : null,
				arrayDistanceNodeId: arrayDistanceExists
					? bridgeSnapshot.arrayDistanceNodeId
					: null,
				selectedMeshInstanceId: null,
				contextMenu: null,
			})
		}
		this.requestRenderSync()
	}
}

function describeAlignmentError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause)
	} catch {
		return String(cause)
	}
}
