import { useEffect, useRef, useState } from 'react'
import { AlignCenter, ArrowLeft, ChevronDown, Move3d, Rotate3d, Scaling } from 'lucide-react'
import type { TransformControlsMode } from 'three/examples/jsm/controls/TransformControls.js'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	useReactBridgeSnapshot,
	useEditor,
} from '@/parametric/editor/react/EditorContext'
import { ConfiguratorPanel } from '@/parametric/components/ConfiguratorPanel'
import { cn } from '@/lib/utils'
import { ViewportAlignmentDialog } from '@/parametric/three/ViewportAlignmentDialog'

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
	const editor = useEditor()
	const viewport = editor.viewport
	const snapshot = useReactBridgeSnapshot()
	const [alignmentGizmoEnabled, setAlignmentGizmoEnabled] = useState(false)
	const [alignmentDialogOpen, setAlignmentDialogOpen] = useState(false)

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return
		viewport.attach(canvas, container)
		return () => viewport.detach()
	}, [viewport])

	useEffect(() => {
		if (snapshot.transformNodeId) return
		setAlignmentGizmoEnabled(false)
		setAlignmentDialogOpen(false)
		viewport.setAlignmentGizmoEnabled(false)
	}, [snapshot.transformNodeId, viewport])

	const selectTransformMode = (mode: TransformControlsMode) => {
		setAlignmentGizmoEnabled(false)
		setAlignmentDialogOpen(false)
		viewport.setAlignmentGizmoEnabled(false)
		viewport.controller.setTransformMode(mode)
	}

	const toggleAlignment = () => {
		const nextEnabled = !alignmentGizmoEnabled
		setAlignmentGizmoEnabled(nextEnabled)
		viewport.setAlignmentGizmoEnabled(nextEnabled)
	}

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
					<div className="text-sm font-semibold">Editor error</div>
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
							variant={!alignmentGizmoEnabled && snapshot.transformMode === mode ? 'secondary' : 'ghost'}
							size="sm"
							className="text-xs"
							aria-pressed={snapshot.transformMode === mode}
							onClick={() => selectTransformMode(mode)}
						>
							<Icon />
							{label}
						</Button>
					))}
					<ButtonGroup data-id="three-editor-transform-align-group">
						<Button
							data-id="three-editor-transform-align"
							type="button"
							variant={alignmentGizmoEnabled ? 'secondary' : 'ghost'}
							size="sm"
							className="text-xs"
							aria-pressed={alignmentGizmoEnabled}
							onClick={toggleAlignment}
						>
							<AlignCenter />
							Align
						</Button>
						<Button
							data-id="three-editor-transform-align-dialog"
							type="button"
							variant="ghost"
							size="sm"
							className="px-2"
							aria-label="Open detailed alignment dialog"
							aria-haspopup="dialog"
							onClick={() => setAlignmentDialogOpen(true)}
						>
							<ChevronDown />
						</Button>
					</ButtonGroup>
				</div>
			)}
			{snapshot.transformNodeId && alignmentDialogOpen && (
				<ViewportAlignmentDialog
					key={snapshot.transformNodeId}
					open
					nodeId={snapshot.transformNodeId}
					initialSettings={snapshot.alignmentSettings}
					onOpenChange={setAlignmentDialogOpen}
					onApply={(request) => viewport.alignTransform(snapshot.transformNodeId as string, request)}
				/>
			)}
			{snapshot.previewNodeId ? (
				<Button
					data-id="three-editor-show-assembly-output"
					type="button"
					variant="outline"
					size="sm"
					className="absolute right-3 top-3 bg-surface text-xs shadow-md"
					onClick={() => viewport.controller.showGraphOutput()}
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
						onClick={() => viewport.controller.goToOriginalAssetNode()}
					>
						Go to original asset node
					</Button>
				</div>
			)}
		</div>
	)
}
