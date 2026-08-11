import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getColorLabel } from '@/parametric/model/ColorPalette'

export function ColorOptionSelect({
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
	options: readonly string[]
}) {
	return (
		<Select value={value} onValueChange={onValueChange} disabled={disabled}>
			<SelectTrigger
				id={id}
				data-id={id ? `${id}-control` : 'color-option-select'}
				className={cn('nodrag h-8 px-2 text-xs', className)}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((color) => (
					<SelectItem key={color} value={color}>
						<span className="flex items-center gap-2">
							<span
								className="h-3 w-3 rounded-full border border-white/20"
								style={{ backgroundColor: color }}
							/>
							{getColorLabel(color)}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
