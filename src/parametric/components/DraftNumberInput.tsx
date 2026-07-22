import { type ComponentProps, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

interface DraftNumberInputProps
	extends Omit<
		ComponentProps<typeof Input>,
		'type' | 'value' | 'defaultValue' | 'onChange' | 'onFocus' | 'onBlur' | 'step' | 'min'
	> {
	value: number
	onValueChange: (value: number) => void
	step?: number
	min?: number
}

export function DraftNumberInput({
	value,
	onValueChange,
	step = 0.1,
	min,
	className,
	...props
}: DraftNumberInputProps) {
	const [draft, setDraft] = useState(String(value))
	const [focused, setFocused] = useState(false)

	useEffect(() => {
		if (!focused) setDraft(String(value))
	}, [focused, value])

	return (
		<Input
			type="number"
			min={min}
			step={step}
			value={draft}
			onFocus={() => setFocused(true)}
			onChange={(event) => {
				const next = event.target.value
				setDraft(next)
				const parsed = Number(next)
				if (next !== '' && Number.isFinite(parsed)) onValueChange(parsed)
			}}
			onBlur={() => {
				setFocused(false)
				const parsed = Number(draft)
				if (draft !== '' && Number.isFinite(parsed)) onValueChange(parsed)
			}}
			className={className}
			{...props}
		/>
	)
}
