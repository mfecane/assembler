import { ModelMetadataPanel } from '@/models/ModelMetadataPanel'
import { ModelViewport } from '@/models/ModelViewport'

export function ModelEditingWorkspace() {
	return (
		<div data-id="model-editor-workspace" className="flex min-h-0 flex-1">
			<div className="min-w-0 flex-1">
				<ModelViewport />
			</div>
			<ModelMetadataPanel />
		</div>
	)
}
