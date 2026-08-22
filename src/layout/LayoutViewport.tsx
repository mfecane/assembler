import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { DoorClosed, DoorOpen, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Toggle } from '@/components/ui/toggle'
import { ProductAnimationLabelDialog } from '@/layout/ProductAnimationLabelDialog'
import { LayoutViewportEditor } from '@/layout/LayoutViewportEditor'
import { DEFAULT_PRODUCT_ANIMATION_LABEL } from '@/layout/LayoutDocument'
import { useEditor } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { cn } from '@/lib/utils'

export function LayoutViewport() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const [renameOpen, setRenameOpen] = useState(false)
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
	const animationLabel = product.animationLabel ?? DEFAULT_PRODUCT_ANIMATION_LABEL

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
			{viewportSnapshot.hasAnimation && (
				<ButtonGroup
					data-id="product-animation-controls"
					className="absolute bottom-3 left-3 z-10 rounded-md shadow-md"
				>
					<Toggle
						data-id="product-door-animation-toggle"
						variant="outline"
						pressed={viewportSnapshot.doorsOpen}
						className={cn(
							'h-9 min-w-44 justify-start bg-background px-3',
							'data-[state=on]:border-primary data-[state=on]:bg-primary',
							'data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90',
						)}
						aria-label={animationLabel}
						title={animationLabel}
						onPressedChange={(open) => viewport.setDoorsOpen(open)}
					>
						{viewportSnapshot.doorsOpen ? <DoorOpen /> : <DoorClosed />}
						<span className="truncate">{animationLabel}</span>
					</Toggle>
					<Button
						data-id="rename-product-door-animation"
						type="button"
						variant="outline"
						size="icon"
						className="bg-background"
						aria-label="Edit animation button label"
						title="Edit animation button label"
						onClick={() => setRenameOpen(true)}
					>
						<Pencil />
					</Button>
				</ButtonGroup>
			)}
			<ProductAnimationLabelDialog
				label={animationLabel}
				open={renameOpen}
				onOpenChange={setRenameOpen}
				onSave={(label) => editor.controller.setProductAnimationLabel(product.id, label)}
			/>
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
