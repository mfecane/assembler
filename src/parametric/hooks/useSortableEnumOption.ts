import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'

const enumOptionType = 'enum-option'

interface DraggedEnumOption {
	index: number
}

export function useSortableEnumOption(
	index: number,
	onMove: (sourceIndex: number, targetIndex: number) => void
) {
	const containerRef = useRef<HTMLDivElement>(null)
	const handleRef = useRef<HTMLButtonElement>(null)
	const [{ isDragging }, connectDrag] = useDrag(
		() => ({
			type: enumOptionType,
			item: { index } satisfies DraggedEnumOption,
			collect: (monitor) => ({ isDragging: monitor.isDragging() }),
		}),
		[index]
	)
	const [, connectDrop] = useDrop(
		() => ({
			accept: enumOptionType,
			hover: (item: DraggedEnumOption, monitor) => {
				if (item.index === index || !containerRef.current) return
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
		[index, onMove]
	)
	connectDrag(handleRef)
	connectDrop(containerRef)
	return { containerRef, handleRef, isDragging }
}
