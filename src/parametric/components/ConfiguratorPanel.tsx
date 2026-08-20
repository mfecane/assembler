import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumericInput } from '@/parametric/components/NumericInput'
import { MaterialSelect } from '@/parametric/components/MaterialSelect'
import { useConfiguration } from '@/parametric/hooks/useConfiguration'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export function ConfiguratorPanel() {
	const [expanded, setExpanded] = useState(true)
	const {
		isRootGraphOpen,
		rootGraphId,
		rootLabel,
		values,
		setNumberValue,
		setEnumValue,
		setMaterialValue,
		setColorValue,
		setVector3Value,
		setBooleanValue,
		setNumberArrayValue,
	} = useConfiguration()
	if (values.length === 0) return null

	return (
		<div
			data-id={isRootGraphOpen ? 'configuration-panel' : 'subgraph-input-panel'}
			data-root-graph-id={rootGraphId}
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
				<span
					className="flex-1 truncate text-left text-sm font-semibold"
					title={`${isRootGraphOpen ? 'Configuration' : 'Inputs'} for ${rootLabel}`}
				>
					{isRootGraphOpen ? 'Configuration' : 'Inputs'} · {rootLabel}
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
					data-id={isRootGraphOpen ? 'configuration-panel-fields' : 'subgraph-input-fields'}
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
							{value.type === 'numberArray' ? (
								<div
									data-id={`configuration-number-array-${value.id}`}
									className="space-y-2"
								>
									{value.value.map((item, index) => (
										<div key={index} className="grid grid-cols-[1fr_4rem] items-center gap-2">
											<Label
												htmlFor={`configuration-${value.id}-${index}`}
												className="truncate text-[11px] text-muted-foreground"
												title={value.labels[index]}
											>
												{value.labels[index]}
											</Label>
											<NumericInput
												id={`configuration-${value.id}-${index}`}
												data-id={`configuration-number-array-${value.id}-${index}`}
												className="h-8 px-2 text-xs tabular-nums"
												value={item}
												min={0}
												step={value.step}
												roundStep={value.step}
												onValueChange={(next) => setNumberArrayValue(value.id, index, next)}
											/>
										</div>
									))}
									{value.total !== undefined && (
										<div className="text-right text-[10px] text-muted-foreground">
											{value.value.reduce((total, item) => total + item, 0)} / {value.total} total
										</div>
									)}
								</div>
							) : value.type === 'number' ? (
								<NumericInput
									className="h-8 w-full px-2 text-xs tabular-nums"
									id={`configuration-${value.id}`}
									value={value.value}
									onValueChange={(next) => setNumberValue(value.id, next)}
									step={value.step}
								/>
							) : value.type === 'slider' ? (
								<div
									data-id={`configuration-slider-${value.id}`}
									className="grid grid-cols-[1fr_2.5rem] items-center gap-x-2 gap-y-1"
								>
									<Slider
										data-id={`configuration-slider-control-${value.id}`}
										id={`configuration-${value.id}`}
										value={[value.value]}
										min={value.min}
										max={value.max}
										step={value.step}
										disabled={value.max <= value.min}
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
									value={String(value.value)}
									onValueChange={(next) => setEnumValue(value.id, Number(next))}
								>
									<SelectTrigger
										id={`configuration-${value.id}`}
										className="h-8 w-full px-2 text-xs"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{value.options.map((option, index) => (
											<SelectItem key={index} value={String(index)}>{option}</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : value.type === 'material' ? (
								<MaterialSelect
									id={`configuration-${value.id}`}
									dataId={`configuration-${value.id}`}
									value={value.value}
									onValueChange={(next) => setMaterialValue(value.id, next)}
									className="h-8 w-full px-2 text-xs"
									ariaLabel={value.label}
								/>
							) : value.type === 'color' ? (
								<Select
									value={value.value}
									onValueChange={(next) => setColorValue(value.id, next)}
								>
									<SelectTrigger
										id={`configuration-${value.id}`}
										data-id={`configuration-color-${value.id}`}
										className="h-8 w-full px-2 text-xs"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{COLOR_PALETTE.map((option) => (
											<SelectItem key={option.hex} value={option.hex}>
												{option.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : value.type === 'vector3' ? (
								<div
									data-id={`configuration-vector3-${value.id}`}
									className="flex flex-col gap-1"
								>
									{(['x', 'y', 'z'] as const).map((axis) => (
										<NumericInput
											key={axis}
											data-id={`configuration-vector3-${value.id}-${axis}`}
											className="h-8 w-full px-2 text-xs tabular-nums"
											value={value.value[axis]}
											step={value.step}
											onValueChange={(next) => setVector3Value(
												value.id,
												{ ...value.value, [axis]: next }
											)}
										/>
									))}
								</div>
							) : (
								<div className="flex h-8 items-center justify-end">
									<Switch
										id={`configuration-${value.id}`}
										data-id={`configuration-switch-${value.id}`}
										checked={value.value}
										onCheckedChange={(next) => setBooleanValue(value.id, next)}
										aria-label={value.label}
									/>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
