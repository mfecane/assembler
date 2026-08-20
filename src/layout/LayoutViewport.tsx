import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LayoutViewportEditor } from '@/layout/LayoutViewportEditor'
import { useEditor } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { cn } from '@/lib/utils'

export function LayoutViewport() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const editor = useEditor()
	const viewport = useMemo(() => new LayoutViewportEditor(editor.controller), [editor])
	const viewportSnapshot = useSyncExternalStore(
		viewport.subscribe,
		viewport.getSnapshot,
		viewport.getSnapshot
	)
	const { document } = useGraphSnapshot()
	const layoutData = document.getLayout()
	const product = layoutData.products.find((item) => item.id === layoutData.activeProductId)
	if (!product) {
		throw new Error(
			`Product viewport cannot find active product "${layoutData.activeProductId}". Available products: `
			+ `${JSON.stringify(layoutData.products.map((item) => item.id))}.`
		)
	}

	useEffect(() => {
		const canvas = canvasRef.current
		const container = containerRef.current
		if (!canvas || !container) return
		viewport.attach(canvas, container)
		return () => viewport.dispose()
	}, [viewport])

	return (
		<div
			ref={containerRef}
			data-id="product-editor-viewport"
			className="relative h-full w-full overflow-hidden"
		>
			<canvas ref={canvasRef} data-id="product-editor-canvas" className="block h-full w-full" />
			{viewportSnapshot.error && (
				<div
					data-id="product-editor-error"
					role="alert"
					className={cn(
						'absolute inset-x-3 top-3 z-20 rounded-md border border-danger/40',
						'bg-surface p-3 text-danger shadow-md',
					)}
				>
					<div className="text-sm font-semibold">Product editor error</div>
					<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-foreground">
						{viewportSnapshot.error}
					</pre>
				</div>
			)}
			{viewportSnapshot.addSlots.map((slot) => slot.visible && (
				<Button
					key={slot.id}
					data-id={`layout-slot-plus-${slot.index + 1}`}
					type="button"
					size="icon"
					className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
					style={{ left: slot.x, top: slot.y }}
					aria-label={`Add item ${slot.index + 1}`}
					title={`Add item ${slot.index + 1}`}
					onClick={() => editor.controller.addDefaultProductInstance(product.id)}
				>
					<Plus />
				</Button>
			))}
		</div>
	)
}
