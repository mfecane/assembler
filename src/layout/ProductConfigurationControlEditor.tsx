import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProductConfigurationControl } from '@/layout/LayoutDocument'
import type { GraphInputDefinition } from '@/parametric/model/GraphDocumentModel'
import { idGenerator } from '@/parametric/model/IdGenerator'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

export interface ConfigurationBindingCandidate {
	key: string
	instanceId: string
	itemLabel: string
	input: GraphInputDefinition
}

type ScalarControl = Exclude<ProductConfigurationControl, { type: 'sectionList' }>

export function ConfigurationControlEditor({
	control,
	candidates,
	boundTargetKeys,
	index,
	controlCount,
	onChange,
	onMove,
	onRemove,
}: {
	control: ProductConfigurationControl
	candidates: ConfigurationBindingCandidate[]
	boundTargetKeys: Set<string>
	index: number
	controlCount: number
	onChange: (control: ProductConfigurationControl) => void
	onMove: (index: number) => void
	onRemove: () => void
}) {
	return (
		<div data-id={`product-configuration-control-${control.id}`} className="rounded-md border bg-background">
			<div className="flex items-center gap-2 border-b p-2">
				<div className="min-w-0 flex-1 px-1">
					<p className="truncate text-sm font-medium">{control.label || 'Untitled control'}</p>
					<p className="truncate text-xs text-muted-foreground">
						{control.type === 'sectionList'
							? `${control.fields.length} per-section ${control.fields.length === 1 ? 'value' : 'values'}`
							: getTargetDescription(candidates, control.target.instanceId, control.target.inputId)}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={index === 0}
					aria-label={`Move ${control.label || 'control'} up`}
					onClick={() => onMove(index - 1)}
				>
					<ArrowUp />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={index === controlCount - 1}
					aria-label={`Move ${control.label || 'control'} down`}
					onClick={() => onMove(index + 1)}
				>
					<ArrowDown />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Remove ${control.label || 'control'}`}
					onClick={onRemove}
				>
					<Trash2 />
				</Button>
			</div>
			{control.type === 'sectionList' ? (
				<SectionControlSettings
					control={control}
					candidates={candidates}
					boundTargetKeys={boundTargetKeys}
					onChange={onChange}
				/>
			) : (
				<ScalarControlSettings control={control} candidates={candidates} onChange={onChange} />
			)}
		</div>
	)
}

function ScalarControlSettings({ control, candidates, onChange }: {
	control: ScalarControl
	candidates: ConfigurationBindingCandidate[]
	onChange: (control: ScalarControl) => void
}) {
	const numeric = control.type === 'number' || control.type === 'slider'
	return (
		<div data-id={`product-scalar-settings-${control.id}`} className="grid gap-3 p-3 sm:grid-cols-2">
			<div className="space-y-1.5">
				<Label htmlFor={`product-control-label-${control.id}`}>Label</Label>
				<Input
					id={`product-control-label-${control.id}`}
					data-id={`product-control-label-${control.id}`}
					value={control.label}
					onChange={(event) => onChange({ ...control, label: event.target.value })}
				/>
			</div>
			<div className="space-y-1.5">
				<Label>Binding</Label>
				<div className="flex h-9 items-center">
					<Badge variant="secondary" className="max-w-full truncate font-normal">
						{getTargetDescription(candidates, control.target.instanceId, control.target.inputId)}
					</Badge>
				</div>
			</div>
			<div className="space-y-1.5">
				<Label>Control</Label>
				{numeric ? (
					<Select
						value={control.type}
						onValueChange={(type) => onChange(type === 'slider'
							? { ...control, type, min: control.min ?? 0, max: control.max ?? 1, step: control.step ?? 0.1 }
							: { ...control, type: 'number' }
						)}
					>
						<SelectTrigger data-id={`product-control-widget-${control.id}`}><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="number">Number field</SelectItem>
							<SelectItem value="slider">Slider</SelectItem>
						</SelectContent>
					</Select>
				) : (
					<div className="flex h-9 items-center text-sm">{getWidgetLabel(control.type)}</div>
				)}
			</div>
			{numeric && <NumericSettings control={control} onChange={onChange} />}
		</div>
	)
}

function NumericSettings({ control, onChange }: {
	control: ScalarControl
	onChange: (control: ScalarControl) => void
}) {
	return (
		<div data-id={`product-control-range-${control.id}`} className="grid grid-cols-3 gap-2 sm:col-span-2">
			<OptionalNumberField
				id={`product-control-min-${control.id}`}
				label="Minimum"
				value={control.min}
				onChange={(min) => onChange({ ...control, min })}
			/>
			<OptionalNumberField
				id={`product-control-max-${control.id}`}
				label="Maximum"
				value={control.max}
				onChange={(max) => onChange({ ...control, max })}
			/>
			<OptionalNumberField
				id={`product-control-step-${control.id}`}
				label="Step"
				value={control.step}
				onChange={(step) => onChange({ ...control, step })}
			/>
		</div>
	)
}

function SectionControlSettings({ control, candidates, boundTargetKeys, onChange }: {
	control: Extract<ProductConfigurationControl, { type: 'sectionList' }>
	candidates: ConfigurationBindingCandidate[]
	boundTargetKeys: Set<string>
	onChange: (control: Extract<ProductConfigurationControl, { type: 'sectionList' }>) => void
}) {
	const [fieldTargetKey, setFieldTargetKey] = useState('')
	const countCandidate = candidates.find((candidate) => candidate.key === targetKey(
		control.countTarget.instanceId,
		control.countTarget.inputId
	))
	const availableFields = candidates.filter((candidate) => (
		candidate.instanceId === control.countTarget.instanceId
		&& candidate.input.valueType === 'primitiveArray'
		&& Array.isArray(candidate.input.defaultValue)
		&& typeof candidate.input.defaultValue[0] === 'number'
		&& candidate.input.defaultValue.every((value) => typeof value === 'number')
		&& !boundTargetKeys.has(candidate.key)
	))
	const addField = () => {
		const candidate = availableFields.find((item) => item.key === fieldTargetKey)
		if (!candidate) return
		onChange({ ...control, fields: [...control.fields, {
			id: idGenerator.create('field'),
			label: candidate.input.label,
			target: { instanceId: candidate.instanceId, inputId: candidate.input.id },
			widget: candidate.input.enumId ? 'select' : 'number',
		}] })
		setFieldTargetKey('')
	}
	return (
		<div data-id={`product-section-settings-${control.id}`} className="space-y-4 p-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`product-section-label-${control.id}`}>Label</Label>
					<Input
						id={`product-section-label-${control.id}`}
						data-id={`product-section-label-${control.id}`}
						value={control.label}
						onChange={(event) => onChange({ ...control, label: event.target.value })}
					/>
				</div>
				<div className="space-y-1.5">
					<Label>Section count</Label>
					<div className="flex h-9 items-center">
						<Badge variant="secondary" className="max-w-full truncate font-normal">
							{countCandidate
								? `${countCandidate.itemLabel} · ${countCandidate.input.label}`
								: `Missing binding · ${control.countTarget.instanceId}:${control.countTarget.inputId}`}
						</Badge>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Per-section values</Label>
				{control.fields.map((field, index) => (
					<SectionFieldSettings
						key={field.id}
						field={field}
						candidate={candidates.find((candidate) => candidate.key === targetKey(
							field.target.instanceId,
							field.target.inputId
						))}
						index={index}
						fieldCount={control.fields.length}
						onChange={(next) => onChange({
							...control,
							fields: control.fields.map((item) => item.id === next.id ? next : item),
						})}
						onMove={(to) => onChange({ ...control, fields: move(control.fields, index, to) })}
						onRemove={() => onChange({
							...control,
							fields: control.fields.filter((item) => item.id !== field.id),
						})}
					/>
				))}
			</div>

			{availableFields.length > 0 && (
				<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
					<Select value={fieldTargetKey} onValueChange={setFieldTargetKey}>
						<SelectTrigger data-id={`section-field-target-${control.id}`}>
							<SelectValue placeholder="Add another per-section value" />
						</SelectTrigger>
						<SelectContent>
							{availableFields.map((candidate) => (
								<SelectItem key={candidate.key} value={candidate.key}>{candidate.input.label}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button type="button" variant="outline" disabled={!fieldTargetKey} onClick={addField}>
						<Plus /> Add
					</Button>
				</div>
			)}
		</div>
	)
}

type SectionField = Extract<ProductConfigurationControl, { type: 'sectionList' }>['fields'][number]

function SectionFieldSettings({ field, candidate, index, fieldCount, onChange, onMove, onRemove }: {
	field: SectionField
	candidate: ConfigurationBindingCandidate | undefined
	index: number
	fieldCount: number
	onChange: (field: SectionField) => void
	onMove: (index: number) => void
	onRemove: () => void
}) {
	const isChoice = Boolean(candidate?.input.enumId)
	const numeric = !isChoice
	return (
		<div data-id={`product-section-field-${field.id}`} className="space-y-3 rounded-md border p-3">
			<div className="flex items-center gap-2">
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs text-muted-foreground">
						{candidate?.input.label ?? `Missing binding · ${field.target.instanceId}:${field.target.inputId}`}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={index === 0}
					aria-label={`Move ${field.label} up`}
					onClick={() => onMove(index - 1)}
				>
					<ArrowUp />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={index === fieldCount - 1}
					aria-label={`Move ${field.label} down`}
					onClick={() => onMove(index + 1)}
				>
					<ArrowDown />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={fieldCount === 1}
					aria-label={`Remove ${field.label}`}
					onClick={onRemove}
				>
					<Trash2 />
				</Button>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`section-field-label-${field.id}`}>Label</Label>
					<Input
						id={`section-field-label-${field.id}`}
						data-id={`section-field-label-${field.id}`}
						value={field.label}
						onChange={(event) => onChange({ ...field, label: event.target.value })}
					/>
				</div>
				<div className="space-y-1.5">
					<Label>Control</Label>
					{isChoice ? (
						<div className="flex h-9 items-center text-sm">Choice</div>
					) : (
						<Select
							value={field.widget}
							onValueChange={(widget) => onChange(widget === 'slider'
								? { ...field, widget, min: field.min ?? 0, max: field.max ?? 1, step: field.step ?? 0.1 }
								: { ...field, widget: 'number' }
							)}
						>
							<SelectTrigger data-id={`section-field-widget-${field.id}`}><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="number">Number field</SelectItem>
								<SelectItem value="slider">Slider</SelectItem>
							</SelectContent>
						</Select>
					)}
				</div>
			</div>
			{numeric && (
				<div className="grid grid-cols-3 gap-2">
					<OptionalNumberField
						id={`section-field-min-${field.id}`}
						label="Minimum"
						value={field.min}
						onChange={(min) => onChange({ ...field, min })}
					/>
					<OptionalNumberField
						id={`section-field-max-${field.id}`}
						label="Maximum"
						value={field.max}
						onChange={(max) => onChange({ ...field, max })}
					/>
					<OptionalNumberField
						id={`section-field-step-${field.id}`}
						label="Step"
						value={field.step}
						onChange={(step) => onChange({ ...field, step })}
					/>
				</div>
			)}
		</div>
	)
}

function OptionalNumberField({ id, label, value, onChange }: {
	id: string
	label: string
	value: number | undefined
	onChange: (value: number | undefined) => void
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				data-id={id}
				type="number"
				value={value ?? ''}
				onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
			/>
		</div>
	)
}

function getTargetDescription(
	candidates: ConfigurationBindingCandidate[],
	instanceId: string,
	inputId: string
): string {
	const candidate = candidates.find((item) => item.key === targetKey(instanceId, inputId))
	return candidate
		? `${candidate.itemLabel} · ${candidate.input.label}`
		: `Missing binding · ${instanceId}:${inputId}`
}

function getWidgetLabel(type: Exclude<ProductConfigurationControl['type'], 'sectionList'>): string {
	if (type === 'select') return 'Choice'
	if (type === 'switch') return 'Toggle'
	if (type === 'material') return 'Material'
	if (type === 'color') return 'Color'
	if (type === 'vector3') return '3D vector'
	return type === 'slider' ? 'Slider' : 'Number field'
}

function parseOptionalNumber(value: string): number | undefined {
	if (!value.trim()) return undefined
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : undefined
}

function targetKey(instanceId: string, inputId: string): string {
	return `${instanceId}:${inputId}`
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items]
	const [item] = next.splice(from, 1)
	if (item === undefined) return next
	next.splice(to, 0, item)
	return next
}
