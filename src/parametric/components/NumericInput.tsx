import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import type { NumericFieldBinding } from '@/parametric/hooks/useGraphNode'

interface NumericInputProps {
	field: NumericFieldBinding
	id?: string
	step?: number
	min?: number
}

export function NumericInput({ field, id, step = 0.1, min }: NumericInputProps) {
	return (
		<div className="nodrag flex items-center">
			<DraftNumberInput
				id={id}
				value={field.value}
				onValueChange={field.setValue}
				min={min}
				step={step}
				className="w-16 rounded border border-border bg-input px-1 py-0.5 text-foreground"
			/>
		</div>
	)
}
