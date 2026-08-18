import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumericInputProps extends Omit<
	ComponentProps<'input'>,
	| 'type'
	| 'inputMode'
	| 'value'
	| 'defaultValue'
	| 'onChange'
	| 'onFocus'
	| 'onBlur'
	| 'step'
	| 'min'
> {
	value: number
	onValueChange: (value: number) => void
	step?: number
	roundStep?: number
	min?: number
}

const DRAG_PIXELS_PER_STEP = 4

export function NumericInput({
	value,
	onValueChange,
	id,
	step = 0.1,
	roundStep = step,
	min,
	className,
	disabled,
	...props
}: NumericInputProps) {
	const [draft, setDraft] = useState(String(value))
	const [focused, setFocused] = useState(false)
	const dragStart = useRef<{ x: number; value: number } | null>(null)
	const lastDragValue = useRef(value)

	useEffect(() => {
		if (!focused) setDraft(String(value))
	}, [focused, value])

	const applyValue = (value: number) => {
		const rounded = roundToStep(value, roundStep)
		onValueChange(min === undefined ? rounded : Math.max(min, rounded))
	}

	return (
		<div
			data-id={id ? `${id}-draggable-number` : 'draggable-number'}
			data-disabled={disabled || undefined}
			className={cn(
				'nodrag flex h-7 w-16 items-center rounded-md border border-border bg-input',
				'text-foreground focus-within:ring-1 focus-within:ring-ring',
				'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
				className
			)}
		>
			<input
				{...props}
				id={id}
				type="text"
				inputMode="decimal"
				value={draft}
				disabled={disabled}
				className="h-full min-w-0 flex-1 px-1 py-0 text-right text-xs outline-none disabled:cursor-not-allowed"
				onFocus={() => setFocused(true)}
				onChange={(event) => {
					const next = event.target.value
					setDraft(next)
					const parsed = Number(next)
					if (next !== '' && Number.isFinite(parsed)) applyValue(parsed)
				}}
				onBlur={() => {
					setFocused(false)
					const parsed = Number(draft)
					if (draft !== '' && Number.isFinite(parsed)) {
						applyValue(parsed)
					} else {
						setDraft(String(value))
					}
				}}
			/>
			<button
				type="button"
				data-id={id ? `${id}-drag-handle` : 'number-drag-handle'}
				className="flex h-full w-6 shrink-0 touch-none cursor-ew-resize items-center justify-center disabled:cursor-not-allowed"
				disabled={disabled}
				aria-label="Drag sideways to adjust value"
				title={`Drag sideways to adjust by ${roundStep}; hold Shift for ${roundStep / 10}`}
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture(event.pointerId)
					dragStart.current = { x: event.clientX, value }
					lastDragValue.current = value
				}}
				onPointerMove={(event) => {
					if (!dragStart.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
					const effectiveStep = event.shiftKey ? roundStep / 10 : roundStep
					const stepCount = Math.round(
						(event.clientX - dragStart.current.x) / DRAG_PIXELS_PER_STEP
					)
					const nextValue = roundToStep(
						dragStart.current.value + stepCount * effectiveStep,
						effectiveStep
					)
					const constrainedValue = min === undefined ? nextValue : Math.max(min, nextValue)
					if (constrainedValue === lastDragValue.current) return
					lastDragValue.current = constrainedValue
					onValueChange(constrainedValue)
				}}
				onPointerUp={(event) => {
					dragStart.current = null
					event.currentTarget.releasePointerCapture(event.pointerId)
				}}
				onPointerCancel={() => {
					dragStart.current = null
				}}
			>
				<ChevronsLeftRight aria-hidden="true" className="size-4" />
			</button>
		</div>
	)
}

function roundToStep(value: number, step: number): number {
	if (!Number.isFinite(step) || step <= 0) {
		throw new Error(`Number input roundStep must be a positive finite number; received ${step}.`)
	}
	const decimals = decimalPlaces(step)
	return Number((Math.round(value / step) * step).toFixed(decimals))
}

function decimalPlaces(value: number): number {
	const text = String(value).toLowerCase()
	if (!text.includes('e-')) return text.split('.')[1]?.length ?? 0
	const [coefficient, exponent] = text.split('e-')
	return Number(exponent) + (coefficient.split('.')[1]?.length ?? 0)
}
