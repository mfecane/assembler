import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getPresetColors } from '@/parametric/model/ColorPalette'

export function PresetColorSelect({
	id,
	value,
	onValueChange,
	className,
	disabled,
	options,
}: {
	id?: string
	value: string
	onValueChange: (value: string) => void
	className?: string
	disabled?: boolean
	options?: readonly string[]
}) {
	const colors = getPresetColors(options)

	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger
				id={id}
				disabled={disabled}
				className={cn('nodrag h-8 px-2 text-xs', className)}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{colors.map((color) => (
					<SelectItem key={color.value} value={color.value}>
						<span className="flex items-center gap-2">
							<span
								className="h-3 w-3 rounded-full border border-white/20"
								style={{ backgroundColor: color.value }}
							/>
							{color.label}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
