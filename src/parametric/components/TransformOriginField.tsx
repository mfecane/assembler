import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { OriginAxis, TransformOrigin } from '@/parametric/model/GraphNode'

interface TransformOriginFieldProps {
	value: TransformOrigin
	onChange: (value: TransformOrigin) => void
}

const options: ReadonlyArray<{ value: OriginAxis; label: string }> = [
	{ value: 'min', label: 'Min' },
	{ value: 'middle', label: 'Middle' },
	{ value: 'max', label: 'Max' },
]

export function TransformOriginField({ value, onChange }: TransformOriginFieldProps) {
	const handleChange = (axis: keyof TransformOrigin, next: string) => {
		onChange({ ...value, [axis]: next as OriginAxis })
	}

	return (
		<div className="nodrag flex flex-col gap-1 text-xs">
			<span className="text-muted-foreground">Origin</span>
			<div className="flex flex-col gap-1">
				{(['x', 'y', 'z'] as const).map((axis) => (
					<div key={axis} className="flex items-center justify-between gap-2 text-muted-foreground">
						<span className="uppercase">{axis}</span>
						<Label className="sr-only" htmlFor={`origin-${axis}`}>
							Origin {axis.toUpperCase()}
						</Label>
						<Select value={value[axis]} onValueChange={(next) => handleChange(axis, next)}>
							<SelectTrigger id={`origin-${axis}`} className="h-7 w-24 px-2 text-xs">
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
		</div>
	)
}
