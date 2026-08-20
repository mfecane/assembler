import type { ModelBoundingBoxMetadata } from '@/models/ModelBoundsMetadata'
import type { ModelPivotEditingMode } from '@/models/ModelPivotMetadata'
import type { ModelGeometryAxis } from '@/models/ModelStretchMetadata'
import type { ModelUvAttribute } from '@/models/ModelUvAttribute'
import { DEFAULT_CHECKER_TEXTURE_SCALE } from '@/models/ModelCheckerTexture'
import type { MaterialDefinition } from '@/parametric/model/MaterialDefinition'

export interface ModelReactBridgeSnapshot {
	revision: number
	modelSize: ModelBoundingBoxMetadata['size']
	previewSize: ModelBoundingBoxMetadata['size']
	activeStretchAxis: ModelGeometryAxis | null
	scaleToolActive: boolean
	pivotEditingMode: ModelPivotEditingMode | null
	pivotFineTuneEnabled: boolean
	checkerTextureEnabled: boolean
	checkerTextureScale: number
	uvViewEnabled: boolean
	uvViewAvailable: boolean
	uvAttribute: ModelUvAttribute | null
	materials: readonly MaterialDefinition[]
	isSaving: boolean
	saved: boolean
	canUndo: boolean
	canRedo: boolean
	activeToolId: string | null
	error: string | null
	viewportError: string | null
}

type ModelReactBridgeListener = () => void

export class ModelReactBridge {
	private readonly listeners = new Set<ModelReactBridgeListener>()
	private snapshot: ModelReactBridgeSnapshot

	public constructor(
		modelSize: ModelBoundingBoxMetadata['size'],
		materials: readonly MaterialDefinition[]
	) {
		this.snapshot = {
			revision: 0,
			modelSize,
			previewSize: { ...modelSize },
			activeStretchAxis: null,
			scaleToolActive: false,
			pivotEditingMode: null,
			pivotFineTuneEnabled: false,
			checkerTextureEnabled: false,
			checkerTextureScale: DEFAULT_CHECKER_TEXTURE_SCALE,
			uvViewEnabled: false,
			uvViewAvailable: false,
			uvAttribute: null,
			materials,
			isSaving: false,
			saved: false,
			canUndo: false,
			canRedo: false,
			activeToolId: null,
			error: null,
			viewportError: null,
		}
	}

	public readonly getSnapshot = (): ModelReactBridgeSnapshot => this.snapshot

	public readonly subscribe = (listener: ModelReactBridgeListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public update(update: Partial<Omit<ModelReactBridgeSnapshot, 'revision'>>): void {
		const changed = Object.entries(update).some(
			([key, value]) => !Object.is(this.snapshot[key as keyof ModelReactBridgeSnapshot], value)
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
