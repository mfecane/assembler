import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import type { SceneNodeInstanceReference } from '@/parametric/evaluation/SceneMetadata'
import {
	createDefaultViewportAlignmentRequest,
	type ViewportAlignmentRequest,
} from '@/parametric/three/editor/ViewportAlignment'

export interface ViewportContextMenu {
	x: number
	y: number
	meshInstanceId: string
	originNode: SceneNodeInstanceReference
}

export interface GraphNodeFocusRequest {
	graphId: string
	nodeId: string
}

export interface ReactBridgeSnapshot {
	revision: number
	canUndo: boolean
	canRedo: boolean
	previewNodeId: string | null
	transformNodeId: string | null
	arrayDistanceNodeId: string | null
	rotateAnimationHintNodeId: string | null
	transformMode: TransformControlsMode
	alignmentSettings: ViewportAlignmentRequest
	selectedMeshInstanceId: string | null
	contextMenu: ViewportContextMenu | null
	graphNodeFocusRequest: GraphNodeFocusRequest | null
	error: string | null
}

type ReactBridgeListener = () => void

const initialSnapshot: ReactBridgeSnapshot = {
	revision: 0,
	canUndo: false,
	canRedo: false,
	previewNodeId: null,
	transformNodeId: null,
	arrayDistanceNodeId: null,
	rotateAnimationHintNodeId: null,
	transformMode: 'translate',
	alignmentSettings: createDefaultViewportAlignmentRequest(),
	selectedMeshInstanceId: null,
	contextMenu: null,
	graphNodeFocusRequest: null,
	error: null,
}

export class ReactBridge {
	private readonly listeners = new Set<ReactBridgeListener>()
	private snapshot = initialSnapshot

	public readonly getSnapshot = (): ReactBridgeSnapshot => this.snapshot

	public readonly subscribe = (listener: ReactBridgeListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public update(update: Partial<Omit<ReactBridgeSnapshot, 'revision'>>): void {
		const changed = Object.entries(update).some(
			([key, value]) => !Object.is(this.snapshot[key as keyof ReactBridgeSnapshot], value)
		)
		if (!changed) return
		this.snapshot = {
			...this.snapshot,
			...update,
			revision: this.snapshot.revision + 1,
		}
		for (const listener of this.listeners) listener()
	}
}
