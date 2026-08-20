import { AlertCircle, SlidersHorizontal } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ModelBoundsPanel } from '@/models/ModelBoundsPanel'
import { ModelMaterialsPanel } from '@/models/ModelMaterialsPanel'
import { ModelPivotPanel } from '@/models/ModelPivotPanel'
import { ModelStretchPanel } from '@/models/ModelStretchPanel'
import { ModelUvPanel } from '@/models/ModelUvPanel'
import {
	useModelEditorInstance,
	useModelProjectSnapshot,
	useModelReactBridgeSnapshot,
} from '@/models/editor/react/ModelEditorContext'

export function ModelMetadataPanel() {
	const editor = useModelEditorInstance()
	const controller = editor.controller
	const {
		boundingBox,
		pivot,
		stretchAxes,
		stretchEnabled,
		texelSizeRatio,
		boundsPendingSave,
	} = useModelProjectSnapshot()
	const {
		isSaving,
		error,
		modelSize,
		previewSize,
		activeStretchAxis,
		scaleToolActive,
		pivotEditingMode,
		pivotFineTuneEnabled,
		checkerTextureEnabled,
		checkerTextureScale,
		uvViewEnabled,
		uvAttribute,
		materials,
	} = useModelReactBridgeSnapshot()
	return (
		<aside
			data-id="model-metadata-panel"
			className="flex h-full w-[26rem] max-w-[42vw] shrink-0 flex-col border-l border-border bg-surface"
		>
			<div data-id="model-metadata-panel-header" className="border-b border-border px-4 py-3">
				<div className="flex items-center gap-2">
					<SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
					<h2 className="m-0 text-sm font-semibold">Model settings</h2>
				</div>
				<p className="mb-0 mt-1 text-xs text-muted-foreground">
					Inspect the source model and configure stretch behavior.
				</p>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
				{error && (
					<Alert
						data-id="model-metadata-error"
						variant="destructive"
						className="mt-4"
					>
						<AlertCircle />
						<AlertTitle>Model operation failed</AlertTitle>
						<AlertDescription>
							<pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
								{error}
							</pre>
						</AlertDescription>
						<Button className="mt-3" size="sm" variant="outline" onClick={() => controller.dismissError()}>
							Dismiss
						</Button>
					</Alert>
				)}

				<Accordion
					type="multiple"
					defaultValue={['model-stretch-panel']}
					className="w-full"
				>
						<ModelPivotPanel
							pivot={pivot}
							editingMode={pivotEditingMode}
							fineTuneEnabled={pivotFineTuneEnabled}
							disabled={isSaving}
							onReset={() => controller.resetPivot()}
							onToggleEditing={() => controller.togglePivotEditing()}
							onToggleFineTune={() => controller.togglePivotFineTune()}
						/>
						<ModelStretchPanel
							stretchAxes={stretchAxes}
							stretchEnabled={stretchEnabled}
							texelSizeRatio={texelSizeRatio}
							checkerTextureEnabled={checkerTextureEnabled}
							checkerTextureScale={checkerTextureScale}
							modelSize={modelSize}
							previewSize={previewSize}
							activeStretchAxis={activeStretchAxis}
							scaleToolActive={scaleToolActive}
							disabled={isSaving}
							onEnabledChange={(enabled) => controller.setStretchEnabled(enabled)}
							onTexelSizeRatioChange={(ratio) => controller.setTexelSizeRatio(ratio)}
							onCheckerTextureEnabledChange={(enabled) => controller.setCheckerTextureEnabled(enabled)}
							onCheckerTextureScaleChange={(scale) => controller.setCheckerTextureScale(scale)}
							onAdd={(axis) => controller.addStretchAxis(axis)}
							onUpdate={(axis) => controller.updateStretchAxis(axis)}
							onBoundaryChange={(axis, boxIndex, boundary, value) =>
								controller.updateStretchBoundary(axis, boxIndex, boundary, value)
							}
							onAddBox={(axis) => controller.addStretchBox(axis)}
							onRemoveBox={(axis, boxIndex) => controller.removeStretchBox(axis, boxIndex)}
							onRemove={(axis) => controller.removeStretchAxis(axis)}
							onToggleBoxEditing={(axis) => controller.toggleStretchBoxEditing(axis)}
							onToggleScaleTool={() => controller.toggleStretchScaleTool()}
							onPreviewSizeChange={(axis, size) => controller.setPreviewSize(axis, size)}
							onResetPreview={() => controller.resetStretchPreview()}
						/>
						<ModelUvPanel
							uvViewEnabled={uvViewEnabled}
							uvAttribute={uvAttribute}
							disabled={isSaving}
							onUvViewChange={(enabled) => controller.setUvViewEnabled(enabled)}
						/>
						<ModelMaterialsPanel materials={materials} />
						<ModelBoundsPanel
							boundingBox={boundingBox}
							boundsPendingSave={boundsPendingSave}
							disabled={isSaving}
							onRead={() => controller.updateBoundsFromModel()}
						/>
				</Accordion>
			</div>
		</aside>
	)
}
