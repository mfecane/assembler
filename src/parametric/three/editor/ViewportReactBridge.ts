import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import type { EvaluatedAssetSource } from '@/parametric/evaluation/EvaluationTypes'

export interface ViewportContextMenu {
	x: number
	y: number
	meshInstanceId: string
	assetSource: EvaluatedAssetSource
}

export interface GraphNodeFocusRequest {
	graphId: string
	nodeId: string
}

export interface ViewportBridgeSnapshot {
	revision: number
	previewNodeId: string | null
	transformNodeId: string | null
	transformMode: TransformControlsMode
	selectedMeshInstanceId: string | null
	contextMenu: ViewportContextMenu | null
	graphNodeFocusRequest: GraphNodeFocusRequest | null
	error: string | null
}

type ViewportBridgeListener = () => void

const initialSnapshot: ViewportBridgeSnapshot = {
	revision: 0,
	previewNodeId: null,
	transformNodeId: null,
	transformMode: 'translate',
	selectedMeshInstanceId: null,
	contextMenu: null,
	graphNodeFocusRequest: null,
	error: null,
}

export class ViewportReactBridge {
	private readonly listeners = new Set<ViewportBridgeListener>()
	private snapshot = initialSnapshot

	public readonly getSnapshot = (): ViewportBridgeSnapshot => this.snapshot

	public readonly subscribe = (listener: ViewportBridgeListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public update(update: Partial<Omit<ViewportBridgeSnapshot, 'revision'>>): void {
		this.snapshot = {
			...this.snapshot,
			...update,
			revision: this.snapshot.revision + 1,
		}
		for (const listener of this.listeners) listener()
	}
}
