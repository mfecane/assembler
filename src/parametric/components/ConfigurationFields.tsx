import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { MaterialSelect } from '@/parametric/components/MaterialSelect'
import { NumericInput } from '@/parametric/components/NumericInput'
import { PrimitiveArrayEditor } from '@/parametric/components/PrimitiveArrayEditor'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import type { ConfigurationField, GraphInputValue } from '@/parametric/model/GraphDocumentModel'

export function ConfigurationFields({
	fields,
	idPrefix,
	onValueChange,
}: {
	fields: ConfigurationField[]
	idPrefix: string
	onValueChange: (inputId: string, value: GraphInputValue) => void
}) {
	return (
		<div data-id={`${idPrefix}-fields`} className="grid grid-cols-1 gap-3">
			{fields.map((field) => (
				<div key={field.id} data-id={`${idPrefix}-field-${field.id}`} className="contents">
					<Label
						htmlFor={`${idPrefix}-${field.id}`}
						className="min-w-0 truncate text-xs text-muted-foreground"
						title={field.label}
					>
						{field.label}
					</Label>
					{field.type === 'primitiveArray' ? (
						<PrimitiveArrayEditor
							dataId={`${idPrefix}-primitive-array-${field.id}`}
							elementType={field.elementType}
							values={field.value}
							options={field.options}
							onChange={(next) => onValueChange(field.id, next)}
						/>
					) : field.type === 'number' ? (
						<NumericInput
							id={`${idPrefix}-${field.id}`}
							data-id={`${idPrefix}-number-${field.id}`}
							className="h-8 w-full px-2 text-xs tabular-nums"
							value={field.value}
							min={field.min}
							max={field.max}
							step={field.step}
							onValueChange={(next) => onValueChange(field.id, next)}
						/>
					) : field.type === 'slider' ? (
						<div
							data-id={`${idPrefix}-slider-${field.id}`}
							className="grid grid-cols-[1fr_2.5rem] items-center gap-x-2 gap-y-1"
						>
							<Slider
								id={`${idPrefix}-${field.id}`}
								data-id={`${idPrefix}-slider-control-${field.id}`}
								value={[field.value]}
								min={field.min}
								max={field.max}
								step={field.step}
								disabled={field.max <= field.min}
								onValueChange={([next]) => {
									if (next !== undefined) onValueChange(field.id, next)
								}}
							/>
							<span className="text-right text-xs tabular-nums text-foreground">{field.value}</span>
						</div>
					) : field.type === 'enum' ? (
						<Select
							value={String(field.value)}
							onValueChange={(next) => onValueChange(field.id, Number(next))}
						>
							<SelectTrigger
								id={`${idPrefix}-${field.id}`}
								data-id={`${idPrefix}-select-${field.id}`}
								className="h-8 w-full px-2 text-xs"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{field.options.map((option, index) => (
									<SelectItem key={index} value={String(index)}>{option}</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : field.type === 'material' ? (
						<MaterialSelect
							id={`${idPrefix}-${field.id}`}
							dataId={`${idPrefix}-material-${field.id}`}
							value={field.value}
							onValueChange={(next) => onValueChange(field.id, next)}
							className="h-8 w-full px-2 text-xs"
							ariaLabel={field.label}
						/>
					) : field.type === 'color' ? (
						<Select value={field.value} onValueChange={(next) => onValueChange(field.id, next)}>
							<SelectTrigger
								id={`${idPrefix}-${field.id}`}
								data-id={`${idPrefix}-color-${field.id}`}
								className="h-8 w-full px-2 text-xs"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{COLOR_PALETTE.map((option) => (
									<SelectItem key={option.hex} value={option.hex}>{option.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : field.type === 'vector3' ? (
						<div data-id={`${idPrefix}-vector3-${field.id}`} className="flex flex-col gap-1">
							{(['x', 'y', 'z'] as const).map((axis) => (
								<NumericInput
									key={axis}
									data-id={`${idPrefix}-vector3-${field.id}-${axis}`}
									className="h-8 w-full px-2 text-xs tabular-nums"
									value={field.value[axis]}
									step={field.step}
									onValueChange={(next) => onValueChange(
										field.id,
										{ ...field.value, [axis]: next }
									)}
								/>
							))}
						</div>
					) : (
						<div className="flex h-8 items-center justify-end">
							<Switch
								id={`${idPrefix}-${field.id}`}
								data-id={`${idPrefix}-switch-${field.id}`}
								checked={field.value}
								onCheckedChange={(next) => onValueChange(field.id, next)}
								aria-label={field.label}
							/>
						</div>
					)}
				</div>
			))}
		</div>
	)
}
