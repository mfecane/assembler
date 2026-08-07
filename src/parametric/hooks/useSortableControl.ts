import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'

const configurationControlType = 'configuration-control'

type DraggedControl = {
	id: string
	index: number
}

export function useSortableControl({
	id,
	index,
	onDragStart,
	onMove,
	onDragEnd,
}: {
	id: string
	index: number
	onDragStart: () => void
	onMove: (sourceIndex: number, targetIndex: number) => void
	onDragEnd: () => void
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const handleRef = useRef<HTMLButtonElement>(null)

	const [{ isDragging }, connectDrag] = useDrag(
		() => ({
			type: configurationControlType,
			item: () => {
				onDragStart()
				return { id, index } satisfies DraggedControl
			},
			end: onDragEnd,
			collect: (monitor) => ({ isDragging: monitor.isDragging() }),
		}),
		[id, index, onDragStart, onDragEnd]
	)

	const [, connectDrop] = useDrop(
		() => ({
			accept: configurationControlType,
			hover: (item: DraggedControl, monitor) => {
				if (item.id === id || !containerRef.current) return

				const pointer = monitor.getClientOffset()
				if (!pointer) return
				const bounds = containerRef.current.getBoundingClientRect()
				const midpoint = (bounds.bottom - bounds.top) / 2
				const pointerOffset = pointer.y - bounds.top

				if (item.index < index && pointerOffset < midpoint) return
				if (item.index > index && pointerOffset > midpoint) return

				onMove(item.index, index)
				item.index = index
			},
		}),
		[id, index, onMove]
	)

	connectDrag(handleRef)
	connectDrop(containerRef)

	return { containerRef, handleRef, isDragging }
}
