import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { useConfiguration } from '@/parametric/hooks/useConfiguration'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export function ConfiguratorPanel() {
	const [expanded, setExpanded] = useState(true)
	const { values, setNumberValue, setEnumValue, setColorValue } = useConfiguration()
	if (values.length === 0) return null

	return (
		<div
			data-id="configuration-panel"
			className="absolute right-3 top-3 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-md"
		>
			<Button
				data-id="configuration-panel-toggle"
				type="button"
				variant="ghost"
				className="h-10 w-full justify-start rounded-none px-3 hover:bg-muted/50"
				aria-expanded={expanded}
				aria-controls="configuration-panel-fields"
				onClick={() => setExpanded((current) => !current)}
			>
				<SlidersHorizontal className="text-muted-foreground" />
				<span className="flex-1 text-left text-sm font-semibold">Configuration</span>
				<span className="text-xs font-normal text-muted-foreground">
					{values.length}
				</span>
				<ChevronDown
					className={`text-muted-foreground transition-transform ${
						expanded ? 'rotate-180' : ''
					}`}
				/>
			</Button>
			{expanded && (
				<div
					id="configuration-panel-fields"
					data-id="configuration-panel-fields"
					className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-x-3 gap-y-3 border-t border-border p-3"
				>
					{values.map((value) => (
						<div
							key={value.id}
							data-id={`configuration-field-${value.id}`}
							className="contents"
						>
							<Label
								htmlFor={`configuration-${value.id}`}
								className="min-w-0 truncate text-xs text-muted-foreground"
								title={value.label}
							>
								{value.label}
							</Label>
							{value.type === 'number' ? (
								<DraftNumberInput
									className="h-8 w-full px-2 text-xs tabular-nums"
									id={`configuration-${value.id}`}
									value={value.value}
									onValueChange={(next) => setNumberValue(value.id, next)}
									step={value.step}
								/>
							) : value.type === 'slider' ? (
								<div className="grid grid-cols-[1fr_2.5rem] items-center gap-2">
									<Slider
										id={`configuration-${value.id}`}
										value={[value.value]}
										min={value.min}
										max={value.max}
										step={value.step}
										onValueChange={([next]) => {
											if (next !== undefined) setNumberValue(value.id, next)
										}}
									/>
									<span className="text-right text-xs tabular-nums text-foreground">
										{value.value}
									</span>
								</div>
							) : value.type === 'enum' ? (
								<Select
									value={value.value}
									onValueChange={(next) => setEnumValue(value.id, next)}
								>
									<SelectTrigger
										id={`configuration-${value.id}`}
										className="h-8 w-full px-2 text-xs"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{value.options.map((option) => (
											<SelectItem key={option} value={option}>{option}</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<PresetColorSelect
									id={`configuration-${value.id}`}
									value={value.value}
									onValueChange={(next) => setColorValue(value.id, next)}
									className="h-8 w-full"
								/>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
