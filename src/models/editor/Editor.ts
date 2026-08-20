import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import { readModelBoundingBox } from '@/models/ModelBoundsMetadata'
import { createModelProject, ModelEditorController } from '@/models/editor/EditorController'
import type { ModelProject } from '@/models/editor/ModelProject'
import { ModelReactBridge } from '@/models/editor/ReactBridge'
import { ModelViewportEditor } from '@/models/editor/ModelViewportEditor'
import { materialRepository } from '@/parametric/three/MaterialRepository'

export class ModelEditorInstance {
	public readonly bridge: ModelReactBridge
	public readonly controller: ModelEditorController
	public readonly viewport: ModelViewportEditor
	private retainCount = 0
	private releaseSequence = 0
	private disposed = false

	private constructor(project: ModelProject, repository: ModelMetadataRepository) {
		this.bridge = new ModelReactBridge(
			readModelBoundingBox(project.modelId).size,
			materialRepository.getMaterials()
		)
		this.controller = new ModelEditorController(project, repository, this.bridge)
		this.viewport = new ModelViewportEditor(project, this.controller, this.bridge)
	}

	public static async create(modelId: string, repository: ModelMetadataRepository): Promise<ModelEditorInstance> {
		try {
			const record = await repository.getMetadata(modelId)
			const project = createModelProject(modelId, record)
			return new ModelEditorInstance(project, repository)
		} catch (cause) {
			throw new Error(
				`Failed to create editor for model "${modelId}" while loading and validating its metadata. `
				+ describeError(cause)
			)
		}
	}

	public retain(): void {
		if (this.disposed) {
			throw new Error(
				`Cannot retain the editor for model "${this.controller.project.modelId}" after disposal.`
			)
		}
		this.retainCount += 1
		this.releaseSequence += 1
	}

	public release(): void {
		this.retainCount = Math.max(0, this.retainCount - 1)
		const sequence = ++this.releaseSequence
		queueMicrotask(() => {
			if (this.retainCount === 0 && sequence === this.releaseSequence) this.dispose()
		})
	}

	public dispose(): void {
		if (this.disposed) return
		this.disposed = true
		try {
			this.viewport.dispose()
		} finally {
			this.controller.dispose()
		}
	}
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
