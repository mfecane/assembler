import { Label } from '@/components/ui/label'
import { NumericInput } from '@/parametric/components/NumericInput'

export function LayoutNumberSetting({
	id,
	label,
	value,
	onChange,
	min,
	max,
	disabled,
	integer = false,
}: {
	id: string
	label: string
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	disabled?: boolean
	integer?: boolean
}) {
	return (
		<div data-id={`${id}-setting`} className="space-y-1 flex gap-3 items-center">
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			<NumericInput
				id={id}
				data-id={id}
				className="w-full"
				value={value}
				onValueChange={onChange}
				step={integer ? 1 : 0.1}
				roundStep={integer ? 1 : 0.001}
				min={min}
				max={max}
				disabled={disabled}
			/>
		</div>
	)
}
