import { NumericInput } from '@/parametric/components/NumericInput'
import type { NumericFieldBinding } from '@/parametric/hooks/useGraphNode'

interface Vec3FieldProps {
	label: string
	fields: Record<'x' | 'y' | 'z', NumericFieldBinding>
	step?: number
	roundStep?: number
}

export function Vec3Field({ label, fields, step = 0.1, roundStep = step }: Vec3FieldProps) {
	return (
		<div data-id={`vector-field-${label.toLowerCase()}`} className="flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<div className="flex gap-1">
				{(['x', 'y', 'z'] as const).map((axis) => (
					<NumericInput
						key={axis}
						step={step}
						roundStep={roundStep}
						value={fields[axis].value}
						onValueChange={fields[axis].setValue}
					/>
				))}
			</div>
		</div>
	)
}
