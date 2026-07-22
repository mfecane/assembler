import { useEffect, useRef } from 'react'
import { ArrowLeft, Move3d, Rotate3d, Scaling } from 'lucide-react'
import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import { Button } from '@/components/ui/button'
import {
	useViewportBridgeSnapshot,
	useViewportEditor,
} from '@/parametric/controller/GraphEditorContext'
import { ConfiguratorPanel } from '@/parametric/components/ConfiguratorPanel'
import { cn } from '@/lib/utils'

const transformTools: ReadonlyArray<{
	mode: TransformControlsMode
	label: string
	icon: typeof Move3d
}> = [
	{ mode: 'translate', label: 'Move', icon: Move3d },
	{ mode: 'rotate', label: 'Rotate', icon: Rotate3d },
	{ mode: 'scale', label: 'Scale', icon: Scaling },
]

export function ThreeViewport() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const editor = useViewportEditor()
	const snapshot = useViewportBridgeSnapshot()

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return
		editor.attach(canvas, container)
		return () => editor.detach()
	}, [editor])

	return (
		<div
			ref={containerRef}
			data-id="three-editor"
			className="relative h-full w-full overflow-hidden"
		>
			<canvas
				ref={canvasRef}
				data-id="three-editor-canvas"
				className="block h-full w-full"
			/>
			{snapshot.error && (
				<div
					data-id="three-editor-error"
					role="alert"
					className="absolute inset-x-3 top-3 z-20 rounded-md border border-danger/40 bg-surface p-3 text-danger shadow-md"
				>
					<div className="text-sm font-semibold">3D editor could not be initialized</div>
					<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-foreground">
						{snapshot.error}
					</pre>
				</div>
			)}
			{snapshot.transformNodeId && (
				<div
					data-id="three-editor-transform-toolbar"
					className="absolute left-3 top-3 flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-md"
					role="toolbar"
					aria-label="Transform tools"
				>
					{transformTools.map(({ mode, label, icon: Icon }) => (
						<Button
							key={mode}
							data-id={`three-editor-transform-${mode}`}
							type="button"
							variant={snapshot.transformMode === mode ? 'secondary' : 'ghost'}
							size="sm"
							className="text-xs"
							aria-pressed={snapshot.transformMode === mode}
							onClick={() => editor.controller.setTransformMode(mode)}
						>
							<Icon />
							{label}
						</Button>
					))}
				</div>
			)}
			{snapshot.previewNodeId ? (
				<Button
					data-id="three-editor-show-assembly-output"
					type="button"
					variant="outline"
					size="sm"
					className="absolute right-3 top-3 bg-surface text-xs shadow-md"
					onClick={() => editor.controller.showGraphOutput()}
				>
					<ArrowLeft />
					Back to assembly output
				</Button>
			) : (
				<ConfiguratorPanel />
			)}
			{snapshot.contextMenu && (
				<div
					data-id="three-editor-selection-menu"
					className={cn(
						'absolute z-10 min-w-52 rounded-md border border-border',
						'bg-popover p-1 text-popover-foreground shadow-md'
					)}
					style={{
						left: snapshot.contextMenu.x,
						top: snapshot.contextMenu.y,
					}}
					role="menu"
					aria-label="Selected asset actions"
				>
					<Button
						data-id="three-editor-go-to-asset-node"
						type="button"
						variant="ghost"
						className="w-full justify-start px-2 font-normal"
						role="menuitem"
						onClick={() => editor.controller.goToOriginalAssetNode()}
					>
						Go to original asset node
					</Button>
				</div>
			)}
		</div>
	)
}
