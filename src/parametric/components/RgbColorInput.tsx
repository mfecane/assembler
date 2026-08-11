import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
	defaultMaterialColor,
	isRgbColor,
	normalizeRgbColor,
} from '@/parametric/model/ColorPalette'

export function RgbColorInput({
	id,
	dataId,
	value,
	onValueChange,
	disabled,
	className,
	ariaLabel = 'RGB color',
}: {
	id?: string
	dataId?: string
	value: string
	onValueChange: (value: string) => void
	disabled?: boolean
	className?: string
	ariaLabel?: string
}) {
	const normalizedValue = isRgbColor(value) ? normalizeRgbColor(value) : defaultMaterialColor
	const [draft, setDraft] = useState(normalizedValue.toUpperCase())
	const [focused, setFocused] = useState(false)

	useEffect(() => {
		if (!focused) setDraft(normalizedValue.toUpperCase())
	}, [focused, normalizedValue])

	const commit = (next: string) => {
		if (!isRgbColor(next)) return
		const normalized = normalizeRgbColor(next)
		setDraft(normalized.toUpperCase())
		onValueChange(normalized)
	}

	return (
		<div
			data-id={dataId ?? (id ? `${id}-rgb` : 'rgb-color-input')}
			className={cn('grid grid-cols-[2.5rem_minmax(5.5rem,1fr)] gap-2', className)}
		>
			<Input
				id={id ? `${id}-picker` : undefined}
				data-id={id ? `${id}-picker` : undefined}
				type="color"
				value={normalizedValue}
				disabled={disabled}
				className="nodrag h-8 cursor-pointer p-1 disabled:cursor-not-allowed"
				onChange={(event) => commit(event.target.value)}
				aria-label={`${ariaLabel} picker`}
			/>
			<Input
				id={id}
				data-id={id ? `${id}-value` : undefined}
				value={draft}
				disabled={disabled}
				className="nodrag h-8 px-2 font-mono text-xs uppercase"
				maxLength={7}
				spellCheck={false}
				aria-label={`${ariaLabel} value in #RRGGBB format`}
				aria-invalid={!isRgbColor(draft)}
				onFocus={() => setFocused(true)}
				onChange={(event) => {
					const next = event.target.value
					setDraft(next)
					commit(next)
				}}
				onBlur={() => {
					setFocused(false)
					if (isRgbColor(draft)) commit(draft)
					else setDraft(normalizedValue.toUpperCase())
				}}
			/>
		</div>
	)
}
