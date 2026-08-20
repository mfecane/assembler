import type { ModelMetadataRecord } from '@/models/ModelCatalogItem'
import { readStoredModelBoundingBox, type ModelBoundingBoxMetadata } from '@/models/ModelBoundsMetadata'
import { readModelPivot, type ModelPivot } from '@/models/ModelPivotMetadata'
import {
	readModelStretchAxes,
	readModelStretchEnabled,
	type ModelStretchAxis,
} from '@/models/ModelStretchMetadata'

export interface ModelProjectCheckpoint {
	metadata: Record<string, unknown>
	documentVersion: number
}

export interface ModelProjectSnapshot {
	revision: number
	documentVersion: number
	record: ModelMetadataRecord | null
	metadata: Record<string, unknown>
	boundingBox: ModelBoundingBoxMetadata
	pivot: ModelPivot
	stretchAxes: ModelStretchAxis[]
	stretchEnabled: boolean
	metadataPendingSave: boolean
	boundsPendingSave: boolean
}

type ModelProjectListener = () => void

export class ModelProject {
	private readonly listeners = new Set<ModelProjectListener>()
	private revision = 0
	private documentVersion = 0
	private snapshot: ModelProjectSnapshot

	public constructor(
		public readonly modelId: string,
		private record: ModelMetadataRecord | null,
		private metadata: Record<string, unknown>
	) {
		this.snapshot = this.createSnapshot()
	}

	public readonly subscribe = (listener: ModelProjectListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public readonly getSnapshot = (): ModelProjectSnapshot => this.snapshot

	public createCheckpoint(): ModelProjectCheckpoint {
		return {
			metadata: this.metadata,
			documentVersion: this.documentVersion,
		}
	}

	public restore(checkpoint: ModelProjectCheckpoint): void {
		this.metadata = checkpoint.metadata
		this.documentVersion = checkpoint.documentVersion
		this.publish()
	}

	public markSaved(record: ModelMetadataRecord, savedDocumentVersion: number): void {
		this.record = record
		if (this.documentVersion === savedDocumentVersion) this.metadata = record.metadata
		this.publish()
	}

	private publish(): void {
		this.revision += 1
		this.snapshot = this.createSnapshot()
		for (const listener of this.listeners) listener()
	}

	private createSnapshot(): ModelProjectSnapshot {
		return {
			revision: this.revision,
			documentVersion: this.documentVersion,
			record: this.record,
			metadata: this.metadata,
			boundingBox: readStoredModelBoundingBox(this.metadata, this.modelId),
			pivot: readModelPivot(this.metadata),
			stretchAxes: readModelStretchAxes(this.metadata),
			stretchEnabled: readModelStretchEnabled(this.metadata),
			metadataPendingSave: !sameMetadata(this.metadata, this.record?.metadata),
			boundsPendingSave: !sameBoundingBox(this.metadata, this.record?.metadata),
		}
	}
}

function sameMetadata(
	currentMetadata: Record<string, unknown>,
	savedMetadata: Record<string, unknown> | undefined
): boolean {
	return JSON.stringify(currentMetadata) === JSON.stringify(savedMetadata ?? {})
}

function sameBoundingBox(
	currentMetadata: Record<string, unknown>,
	savedMetadata: Record<string, unknown> | undefined
): boolean {
	return JSON.stringify(currentMetadata.boundingBox) === JSON.stringify(savedMetadata?.boundingBox)
}
