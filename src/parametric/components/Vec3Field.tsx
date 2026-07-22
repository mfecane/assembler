import { NumericInput } from '@/parametric/components/NumericInput'
import type { NumericFieldBinding } from '@/parametric/hooks/useGraphNode'

interface Vec3FieldProps {
	label: string
	fields: Record<'x' | 'y' | 'z', NumericFieldBinding>
	step?: number
}

export function Vec3Field({ label, fields, step = 0.1 }: Vec3FieldProps) {
	return (
		<div className="nodrag flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<div className="flex gap-1">
				{(['x', 'y', 'z'] as const).map((axis) => (
					<NumericInput
						key={axis}
						step={step}
						field={fields[axis]}
					/>
				))}
			</div>
		</div>
	)
}
