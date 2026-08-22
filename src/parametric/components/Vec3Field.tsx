import { NumericInput } from '@/parametric/components/NumericInput'
import type { NumericFieldBinding } from '@/parametric/hooks/useGraphNode'

interface Vec3FieldProps {
	label: string
	fields: Record<'x' | 'y' | 'z', NumericFieldBinding>
	step?: number
	roundStep?: number
	disabled?: boolean
}

export function Vec3Field({ label, fields, step = 0.1, roundStep = 0.001, disabled }: Vec3FieldProps) {
	return (
		<div data-id={`vector-field-${label.toLowerCase()}`} className="flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<Vec3Inputs fields={fields} step={step} roundStep={roundStep} disabled={disabled} />
		</div>
	)
}

export function Vec3Inputs({
	fields,
	step = 0.1,
	roundStep = 0.001,
	disabled,
}: Omit<Vec3FieldProps, 'label'>) {
	return (
		<div data-id="vector-inputs" className="flex gap-1">
			{(['x', 'y', 'z'] as const).map((axis) => (
				<NumericInput
					key={axis}
					step={step}
					roundStep={roundStep}
					disabled={disabled}
					value={fields[axis].value}
					onValueChange={fields[axis].setValue}
				/>
			))}
		</div>
	)
}
