import { EditorController } from '@/parametric/editor/EditorController'
import { ReactBridge } from '@/parametric/editor/ReactBridge'
import type { GraphDocumentModel } from '@/parametric/model/GraphDocumentModel'
import type { MeshCatalog } from '@/parametric/model/MeshCatalog'
import type { MaterialCatalog } from '@/parametric/model/MaterialCatalog'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'
import { ViewportEditor } from '@/parametric/three/editor/ViewportEditor'

export class Editor {
	public readonly bridge = new ReactBridge()
	public readonly controller: EditorController
	public readonly viewport: ViewportEditor
	private retainCount = 0
	private releaseSequence = 0
	private disposed = false

	public constructor(
		document: GraphDocumentModel,
		nodeRegistry: NodeRegistry,
		meshCatalog: MeshCatalog,
		materialCatalog: MaterialCatalog
	) {
		this.controller = new EditorController(
			document,
			nodeRegistry,
			meshCatalog,
			materialCatalog,
			this.bridge
		)
		this.viewport = new ViewportEditor(this.controller, this.bridge)
	}

	public dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.viewport.dispose()
	}

	public retain(): void {
		if (this.disposed) throw new Error('Cannot retain an Editor after it has been disposed')
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
}
