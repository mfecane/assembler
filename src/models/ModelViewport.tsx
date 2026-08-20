import { useEffect, useRef } from 'react'
import { AlertCircle, Crosshair, Move3d, Scaling, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ModelAxisBadge } from '@/models/ModelAxisBadge'
import {
	useModelEditorInstance,
	useModelReactBridgeSnapshot,
} from '@/models/editor/react/ModelEditorContext'

export function ModelViewport() {
	const editor = useModelEditorInstance()
	const { viewportError, activeStretchAxis, scaleToolActive, pivotEditingMode } = useModelReactBridgeSnapshot()
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) {
			throw new Error(
				`Cannot attach viewport for model "${editor.controller.project.modelId}": `
				+ `canvas present=${Boolean(canvas)}, container present=${Boolean(container)}.`
			)
		}
		editor.viewport.attach(canvas, container)
		return () => editor.viewport.detach()
	}, [editor])

	return (
		<div
			ref={containerRef}
			data-id="model-viewport"
			className="relative h-full min-h-0 w-full overflow-hidden bg-background"
		>
			<canvas ref={canvasRef} data-id="model-viewport-canvas" className="block h-full w-full" />
			{(scaleToolActive || activeStretchAxis || pivotEditingMode) && (
				<Button
					data-id="exit-model-viewport-tool"
					type="button"
					variant="secondary"
					className="absolute bottom-4 left-4 shadow-lg"
					onClick={() => {
						if (pivotEditingMode) editor.controller.deactivatePivotEditing()
						else editor.controller.deactivateStretchTool()
					}}
				>
					{pivotEditingMode ? (
						<><Crosshair /> Finish pivot editing</>
					) : scaleToolActive ? (
						<><Scaling /> Finish scale preview</>
					) : activeStretchAxis ? (
						<>
							<Move3d />
							Finish <ModelAxisBadge axis={activeStretchAxis} className="border-current bg-transparent" /> box adjustment
						</>
					) : null}
				</Button>
			)}
			{viewportError && (
				<Alert
					data-id="model-viewport-error"
					variant="destructive"
					className="absolute inset-x-4 top-4 bg-surface shadow-lg"
				>
					<AlertCircle />
					<AlertTitle>Viewport operation failed</AlertTitle>
					<AlertDescription>
						<pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">
							{viewportError}
						</pre>
					</AlertDescription>
					<Button
						data-id="dismiss-model-viewport-error"
						type="button"
						size="sm"
						variant="outline"
						className="mt-3"
						onClick={() => editor.controller.dismissViewportError()}
					>
						<X /> Dismiss
					</Button>
				</Alert>
			)}
		</div>
	)
}
