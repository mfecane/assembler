import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ResizableSplitViewProps {
	first: ReactNode
	second: ReactNode
	initialSplit?: number
	minimumPaneWidth?: number
	className?: string
}

export function ResizableSplitView({
	first,
	second,
	initialSplit = 50,
	minimumPaneWidth = 280,
	className,
}: ResizableSplitViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [split, setSplit] = useState(initialSplit)
	const draggingRef = useRef(false)

	const clampSplit = (nextSplit: number): number => {
		const width = containerRef.current?.clientWidth ?? 0
		if (width <= 0) return Math.min(80, Math.max(20, nextSplit))
		const minimumSplit = Math.min(45, (minimumPaneWidth / width) * 100)
		return Math.min(100 - minimumSplit, Math.max(minimumSplit, nextSplit))
	}

	const resizeFromPointer = (event: PointerEvent<HTMLDivElement>) => {
		if (!draggingRef.current || !containerRef.current) return
		const bounds = containerRef.current.getBoundingClientRect()
		setSplit(clampSplit(((event.clientX - bounds.left) / bounds.width) * 100))
	}

	return (
		<div ref={containerRef} className={cn('flex h-full w-full overflow-hidden', className)}>
			<div className="min-w-0" style={{ width: `${split}%` }}>
				{first}
			</div>
			<div
				role="separator"
				aria-label="Resize graph and viewport"
				aria-orientation="vertical"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(split)}
				tabIndex={0}
				className="group relative z-10 w-2 shrink-0 cursor-col-resize touch-none bg-border outline-none transition-colors hover:bg-primary focus-visible:bg-primary"
				onDoubleClick={() => setSplit(clampSplit(initialSplit))}
				onPointerDown={(event) => {
					draggingRef.current = true
					event.currentTarget.setPointerCapture(event.pointerId)
				}}
				onPointerMove={resizeFromPointer}
				onPointerUp={(event) => {
					draggingRef.current = false
					event.currentTarget.releasePointerCapture(event.pointerId)
				}}
				onPointerCancel={() => {
					draggingRef.current = false
				}}
				onKeyDown={(event) => {
					if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
						event.preventDefault()
						setSplit((current) => clampSplit(
							current + (event.key === 'ArrowLeft' ? -2 : 2)
						))
					} else if (event.key === 'Home') {
						event.preventDefault()
						setSplit(clampSplit(0))
					} else if (event.key === 'End') {
						event.preventDefault()
						setSplit(clampSplit(100))
					}
				}}
			>
				<div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/20 group-hover:bg-primary-foreground/60" />
			</div>
			<div className="min-w-0 flex-1">
				{second}
			</div>
		</div>
	)
}
