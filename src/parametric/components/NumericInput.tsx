import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import type { NumericFieldBinding } from '@/parametric/hooks/useGraphNode'

interface NumericInputProps {
	field: NumericFieldBinding
	step?: number
	min?: number
}

export function NumericInput({ field, step = 0.1, min }: NumericInputProps) {
	return (
		<div className="nodrag flex items-center">
			<DraftNumberInput
				value={field.value}
				onValueChange={field.setValue}
				min={min}
				step={step}
				className="w-16 rounded border border-border bg-input px-1 py-0.5 text-foreground"
			/>
		</div>
	)
}
