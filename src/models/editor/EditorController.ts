import { readModelBoundingBox, readStoredModelBoundingBox, withModelBoundingBox } from '@/models/ModelBoundsMetadata'
import {
	ModelPivot,
	type ModelPivotEditingMode,
	readModelPivot,
	withModelPivot,
} from '@/models/ModelPivotMetadata'
import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import { validateCheckerTextureScale } from '@/models/ModelCheckerTexture'
import { createModelStretchSizeConstraint } from '@/models/ModelStretchSizeConstraint'
import {
	addModelStretchAxis,
	addModelStretchBox,
	readModelStretchAxes,
	readModelStretchEnabled,
	removeModelStretchAxis,
	removeModelStretchBox,
	type ModelGeometryAxis,
	ModelStretchAxis,
	type StretchBoundary,
	updateModelStretchAxis,
	withModelStretchEnabled,
} from '@/models/ModelStretchMetadata'
import { readModelTexelSizeRatio, withModelTexelSizeRatio } from '@/models/ModelTexelSizeRatio'
import { ModelProject } from '@/models/editor/ModelProject'
import { ModelReactBridge } from '@/models/editor/ReactBridge'
import { ModelCommandFactory } from '@/models/editor/commands/ModelCommandFactory'
import { ModelInteractionController } from '@/models/editor/interactions/ModelInteractionController'
import type { InteractionHandler } from '@/models/editor/interactions/InteractionHandler'
import { ModelToolController } from '@/models/editor/tools/ModelToolController'
import type { ModelTool } from '@/models/editor/tools/ModelTool'
import { HistoryController } from '@/parametric/editor/commands/HistoryController'
import { meshRepository } from '@/parametric/three/MeshRepository'

export class ModelEditorController {
	public readonly history = new HistoryController()
	public readonly interactions: ModelInteractionController
	private readonly tools: ModelToolController
	private readonly commandFactory: ModelCommandFactory

	public constructor(
		public readonly project: ModelProject,
		private readonly repository: ModelMetadataRepository,
		private readonly bridge: ModelReactBridge
	) {
		this.commandFactory = new ModelCommandFactory(project)
		this.interactions = new ModelInteractionController(this)
		this.tools = new ModelToolController(this.interactions, bridge)
		this.publishHistory()
	}

	public async save(): Promise<void> {
		if (this.bridge.getSnapshot().isSaving) return
		this.bridge.update({ isSaving: true, saved: false, error: null })
		try {
			const snapshot = this.project.getSnapshot()
			const record = await this.repository.saveMetadata(this.project.modelId, snapshot.metadata)
			readModelStretchAxes(record.metadata)
			readModelStretchEnabled(record.metadata)
			readModelTexelSizeRatio(record.metadata)
			readModelPivot(record.metadata)
			readStoredModelBoundingBox(record.metadata, this.project.modelId)
			meshRepository.setMetadata(this.project.modelId, record.metadata)
			this.project.markSaved(record, snapshot.documentVersion)
			this.bridge.update({
				saved: this.project.getSnapshot().documentVersion === snapshot.documentVersion,
			})
		} catch (cause) {
			this.reportError('save metadata', cause)
		} finally {
			this.bridge.update({ isSaving: false })
		}
	}

	public updateBoundsFromModel(): void {
		this.updateMetadata('Update model bounds', 'update model bounds', (metadata) => (
			withModelBoundingBox(metadata, readModelBoundingBox(this.project.modelId))
		))
	}

	public updatePivot(pivot: ModelPivot): void {
		if (this.project.getSnapshot().pivot.equals(pivot)) return
		this.updateMetadata(
			'Update model pivot',
			`update model pivot to ${JSON.stringify(pivot.toJSON())}`,
			(metadata) => withModelPivot(metadata, pivot),
			'model-pivot'
		)
	}

	public resetPivot(): void {
		this.updatePivot(new ModelPivot(0, 0, 0))
	}

	public togglePivotEditing(): void {
		const snapshot = this.bridge.getSnapshot()
		if (snapshot.pivotEditingMode) {
			this.deactivatePivotEditing()
			return
		}
		this.bridge.update({
			pivotEditingMode: 'bounds',
			pivotFineTuneEnabled: false,
			activeStretchAxis: null,
			scaleToolActive: false,
			uvViewEnabled: false,
			previewSize: { ...snapshot.modelSize },
			viewportError: null,
		})
	}

	public setPivotEditingMode(mode: ModelPivotEditingMode): void {
		const snapshot = this.bridge.getSnapshot()
		if (!snapshot.pivotEditingMode) {
			this.reportInteractionError(
				`select pivot editing mode "${mode}"`,
				new Error('Pivot editing is not active.')
			)
			return
		}
		this.bridge.update({ pivotEditingMode: mode, viewportError: null })
	}

	public togglePivotFineTune(): void {
		const snapshot = this.bridge.getSnapshot()
		if (!snapshot.pivotEditingMode) {
			this.reportInteractionError(
				'toggle pivot fine tune',
				new Error('Pivot editing is not active.')
			)
			return
		}
		this.bridge.update({
			pivotFineTuneEnabled: !snapshot.pivotFineTuneEnabled,
			viewportError: null,
		})
	}

	public deactivatePivotEditing(): void {
		this.bridge.update({ pivotEditingMode: null, pivotFineTuneEnabled: false, viewportError: null })
	}

	public addStretchAxis(axis: ModelGeometryAxis): void {
		const added = this.updateMetadata(
			`Add ${axis.toUpperCase()} stretch axis`,
			`add ${axis.toUpperCase()} stretch axis`,
			(metadata) => addModelStretchAxis(metadata, readModelBoundingBox(this.project.modelId), axis)
		)
		if (added) this.toggleStretchBoxEditing(axis)
	}

	public setStretchEnabled(enabled: boolean): void {
		this.updateMetadata(
			enabled ? 'Enable stretch' : 'Disable stretch',
			`${enabled ? 'enable' : 'disable'} stretch`,
			(metadata) => withModelStretchEnabled(metadata, enabled)
		)
	}

	public setTexelSizeRatio(texelSizeRatio: number): void {
		this.updateMetadata(
			'Update texel size ratio',
			`update texel size ratio to ${texelSizeRatio} UV units per model unit`,
			(metadata) => withModelTexelSizeRatio(metadata, texelSizeRatio),
			'model-texel-size-ratio'
		)
	}

	public updateStretchAxis(stretchAxis: ModelStretchAxis): void {
		this.updateMetadata(
			`Update ${stretchAxis.axis.toUpperCase()} stretch axis`,
			`update ${stretchAxis.axis.toUpperCase()} stretch axis`,
			(metadata) => updateModelStretchAxis(metadata, stretchAxis),
			`stretch-axis:${stretchAxis.axis}`
		)
	}

	public updateStretchBoundary(
		axis: ModelGeometryAxis,
		boxIndex: number,
		boundary: StretchBoundary,
		value: number
	): void {
		this.updateMetadata(
			`Update ${axis.toUpperCase()} stretch box ${boxIndex + 1} ${boundary}`,
			`update ${axis.toUpperCase()} stretch box ${boxIndex + 1} ${boundary} to ${value}`,
			(metadata) => {
				const stretchAxis = readModelStretchAxes(metadata).find((item) => item.axis === axis)
				if (!stretchAxis) throw new Error(`Cannot update missing ${axis.toUpperCase()} stretch axis.`)
				return updateModelStretchAxis(metadata, stretchAxis.withBoundary(boxIndex, boundary, value))
			},
			`stretch-boundary:${axis}:${boxIndex}:${boundary}`
		)
	}

	public addStretchBox(axis: ModelGeometryAxis): void {
		this.updateMetadata(
			`Add ${axis.toUpperCase()} stretch box`,
			`add ${axis.toUpperCase()} stretch box`,
			(metadata) => addModelStretchBox(metadata, readModelBoundingBox(this.project.modelId), axis)
		)
	}

	public removeStretchBox(axis: ModelGeometryAxis, boxIndex: number): void {
		this.updateMetadata(
			`Remove ${axis.toUpperCase()} stretch box ${boxIndex + 1}`,
			`remove ${axis.toUpperCase()} stretch box ${boxIndex + 1}`,
			(metadata) => removeModelStretchBox(metadata, axis, boxIndex)
		)
	}

	public removeStretchAxis(axis: ModelGeometryAxis): void {
		this.updateMetadata(
			`Remove ${axis.toUpperCase()} stretch axis`,
			`remove ${axis.toUpperCase()} stretch axis`,
			(metadata) => removeModelStretchAxis(metadata, axis)
		)
	}

	public setPreviewSize(axis: ModelGeometryAxis, size: number): void {
		try {
			const stretchAxis = this.project.getSnapshot().stretchAxes.find((item) => item.axis === axis)
			if (!stretchAxis) {
				throw new Error(`Cannot test ${axis.toUpperCase()} size because that stretch axis is not defined.`)
			}
			const modelSize = this.bridge.getSnapshot().modelSize[axis]
			if (!Number.isFinite(size)) {
				throw new Error(
					`Cannot test ${axis.toUpperCase()} size ${size} for model "${this.project.modelId}". `
					+ `The target size must be finite. Model size: ${modelSize}; `
					+ `stretch boxes: ${stretchAxis.boxes.map((box) => `${box.min}–${box.max}`).join(', ')}.`
				)
			}
			const constrainedSize = createModelStretchSizeConstraint(modelSize, stretchAxis).constrain(size)
			this.bridge.update({
				previewSize: { ...this.bridge.getSnapshot().previewSize, [axis]: constrainedSize },
				viewportError: null,
			})
		} catch (cause) {
			this.reportViewportError(`set ${axis.toUpperCase()} stretch test size to ${size}`, cause)
		}
	}

	public resetStretchPreview(): void {
		this.bridge.update({
			previewSize: { ...this.bridge.getSnapshot().modelSize },
			viewportError: null,
		})
	}

	public toggleStretchBoxEditing(axis: ModelGeometryAxis): void {
		const project = this.project.getSnapshot()
		if (!project.stretchEnabled) {
			this.reportInteractionError(
				`toggle ${axis.toUpperCase()} box editing`,
				new Error('Stretch is disabled for this model.')
			)
			return
		}
		const stretchAxes = project.stretchAxes
		if (!stretchAxes.some((item) => item.axis === axis)) {
			this.reportInteractionError(
				`toggle ${axis.toUpperCase()} box editing`,
				new Error(`The ${axis.toUpperCase()} stretch axis is not defined.`)
			)
			return
		}
		const activeStretchAxis = this.bridge.getSnapshot().activeStretchAxis === axis ? null : axis
		this.bridge.update({
			activeStretchAxis,
			scaleToolActive: false,
			pivotEditingMode: null,
			pivotFineTuneEnabled: false,
			uvViewEnabled: false,
			previewSize: activeStretchAxis
				? { ...this.bridge.getSnapshot().modelSize }
				: this.bridge.getSnapshot().previewSize,
			viewportError: null,
		})
	}

	public toggleStretchScaleTool(): void {
		if (!this.project.getSnapshot().stretchEnabled) {
			this.reportInteractionError('toggle stretch scale tool', new Error('Stretch is disabled for this model.'))
			return
		}
		const snapshot = this.bridge.getSnapshot()
		const scaleToolActive = !snapshot.scaleToolActive
		this.bridge.update({
			scaleToolActive,
			activeStretchAxis: null,
			pivotEditingMode: null,
			pivotFineTuneEnabled: false,
			uvViewEnabled: false,
			previewSize: scaleToolActive ? snapshot.previewSize : { ...snapshot.modelSize },
			viewportError: null,
		})
	}

	public deactivateStretchTool(): void {
		const snapshot = this.bridge.getSnapshot()
		this.bridge.update({
			scaleToolActive: false,
			activeStretchAxis: null,
			previewSize: snapshot.scaleToolActive ? { ...snapshot.modelSize } : snapshot.previewSize,
			viewportError: null,
		})
	}

	public setCheckerTextureEnabled(enabled: boolean): void {
		this.bridge.update({ checkerTextureEnabled: enabled, viewportError: null })
	}

	public setCheckerTextureScale(scale: number): void {
		try {
			validateCheckerTextureScale(scale)
			this.bridge.update({ checkerTextureScale: scale, viewportError: null })
		} catch (cause) {
			this.reportViewportError(`set checker texture scale to ${scale}`, cause)
		}
	}

	public setUvViewEnabled(enabled: boolean): void {
		if (enabled && !this.bridge.getSnapshot().uvViewAvailable) {
			this.reportViewportError(
				'enable UV view',
				new Error(`Model "${this.project.modelId}" has no UV attribute.`)
			)
			return
		}
		this.bridge.update({
			uvViewEnabled: enabled,
			viewportError: null,
		})
	}

	public registerTool(tool: ModelTool): AbortController {
		return this.tools.add(tool)
	}

	public registerInteractionHandler(handler: InteractionHandler): AbortController {
		return this.interactions.addHandler(handler)
	}

	public activateTool(toolId: string): void {
		try {
			this.tools.activate(toolId)
		} catch (cause) {
			this.reportInteractionError(`activate tool "${toolId}"`, cause)
		}
	}

	public deactivateTool(): void {
		try {
			this.tools.deactivate()
		} catch (cause) {
			this.reportInteractionError('deactivate active tool', cause)
		}
	}

	public dispose(): void {
		try {
			this.tools.dispose()
		} finally {
			this.interactions.dispose()
		}
	}

	public undo(): void {
		this.applyHistory('undo', () => this.history.undo())
	}

	public redo(): void {
		this.applyHistory('redo', () => this.history.redo())
	}

	public dismissError(): void {
		this.bridge.update({ error: null })
	}

	public dismissViewportError(): void {
		this.bridge.update({ viewportError: null })
	}

	public reportViewportError(operation: string, cause: unknown): void {
		const message = this.createErrorMessage(operation, cause)
		console.error(message, { cause, modelId: this.project.modelId, operation })
		this.bridge.update({ viewportError: message })
	}

	public reportInteractionError(operation: string, cause: unknown): void {
		const message = this.createErrorMessage(`process model interaction (${operation})`, cause)
		console.error(message, { cause, modelId: this.project.modelId, operation })
		this.bridge.update({ viewportError: message })
	}

	private updateMetadata(
		label: string,
		operation: string,
		mutation: (metadata: Record<string, unknown>) => Record<string, unknown>,
		mergeKey?: string
	): boolean {
		try {
			const command = this.commandFactory.updateMetadata(label, mutation, mergeKey)
			if (!this.history.execute(command)) return false
			this.bridge.update({ saved: false, error: null })
			this.synchronizeStretchTool()
			this.publishHistory()
			return true
		} catch (cause) {
			this.reportError(operation, cause)
			return false
		}
	}

	private applyHistory(operation: 'undo' | 'redo', action: () => boolean): void {
		try {
			if (!action()) return
			this.bridge.update({ saved: false, error: null })
			this.synchronizeStretchTool()
			this.publishHistory()
		} catch (cause) {
			this.reportError(operation, cause)
		}
	}

	private publishHistory(): void {
		this.bridge.update({
			canUndo: this.history.canUndo(),
			canRedo: this.history.canRedo(),
		})
	}

	private synchronizeStretchTool(): void {
		const project = this.project.getSnapshot()
		const stretchAxes = project.stretchAxes
		const snapshot = this.bridge.getSnapshot()
		if (!project.stretchEnabled) {
			this.bridge.update({
				activeStretchAxis: null,
				scaleToolActive: false,
				previewSize: { ...snapshot.modelSize },
				viewportError: null,
			})
			return
		}
		const activeStretchAxis = snapshot.activeStretchAxis
		if (activeStretchAxis && !stretchAxes.some((item) => item.axis === activeStretchAxis)) {
			this.bridge.update({ activeStretchAxis: null })
		}
		if (stretchAxes.length === 0 && snapshot.scaleToolActive) {
			this.bridge.update({ scaleToolActive: false })
		}
	}

	private reportError(operation: string, cause: unknown): void {
		const message = this.createErrorMessage(operation, cause)
		console.error(message, { cause, modelId: this.project.modelId, operation })
		this.bridge.update({ error: message, saved: false })
	}

	private createErrorMessage(operation: string, cause: unknown): string {
		return `Failed to ${operation} for model "${this.project.modelId}". ${describeError(cause)}`
	}
}

export function createModelProject(
	modelId: string,
	record: Awaited<ReturnType<ModelMetadataRepository['getMetadata']>>
): ModelProject {
	const loadedMetadata = record?.metadata ?? {}
	readModelStretchAxes(loadedMetadata)
	readModelStretchEnabled(loadedMetadata)
	readModelTexelSizeRatio(loadedMetadata)
	readModelPivot(loadedMetadata)
	readStoredModelBoundingBox(loadedMetadata, modelId)
	return new ModelProject(modelId, record, loadedMetadata)
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause, null, 2) ?? String(cause)
	} catch {
		return String(cause)
	}
}
