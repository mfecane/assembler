import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import type { OriginAxis, TransformOrigin } from '@/parametric/model/GraphNode'

interface TransformOriginFieldProps {
	value: TransformOrigin
	onChange: (value: TransformOrigin) => void
}

const options: ReadonlyArray<{ value: OriginAxis; label: string }> = [
	{ value: 'min', label: 'Min' },
	{ value: 'middle', label: 'Mid' },
	{ value: 'max', label: 'Max' },
]

export function TransformOriginField({ value, onChange }: TransformOriginFieldProps) {
	return (
		<div className="nodrag flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">Origin</span>
			<TransformOriginInputs value={value} onChange={onChange} />
		</div>
	)
}

export function TransformOriginInputs({ value, onChange }: TransformOriginFieldProps) {
	const handleChange = (axis: keyof TransformOrigin, next: string) => {
		onChange({ ...value, [axis]: next as OriginAxis })
	}

	return (
		<div data-id="transform-origin-values" className="nodrag flex items-center gap-2">
			{(['x', 'y', 'z'] as const).map((axis) => (
				<div key={axis} className="flex items-center gap-1">
					<AxisLabel axis={axis} />
					<Label className="sr-only" htmlFor={`origin-${axis}`}>
						Origin {axis.toUpperCase()}
					</Label>
					<Select value={value[axis]} onValueChange={(next) => handleChange(axis, next)}>
						<SelectTrigger id={`origin-${axis}`} className="h-7 w-16 px-2 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			))}
		</div>
	)
}
