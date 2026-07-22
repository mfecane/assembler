import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type {
	ConfigurationPanelControl,
	GraphInputDefinition,
} from '@/parametric/model/GraphDocumentModel'

export function ConfigurationPanelEditorDialog({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const controller = useGraphController()
	const { document: graphDocument, activeGraphId } = useGraphSnapshot()
	const isEntry = activeGraphId === graphDocument.getEntryGraphId()
	const inputs = graphDocument.getEntryGraph().inputs.filter(
		(input) => input.valueType !== 'geometry'
	)
	const controls = graphDocument.getConfigurationControls()
	const availableInputs = inputs.filter(
		(input) => !controls.some((control) => control.inputId === input.id)
	)

	const setControls = (next: ConfigurationPanelControl[]) => {
		controller.setConfigurationControls(next)
	}

	const updateControl = (
		controlId: string,
		update: (control: ConfigurationPanelControl) => ConfigurationPanelControl
	) => {
		setControls(controls.map((control) => control.id === controlId ? update(control) : control))
	}

	const addControl = () => {
		const input = availableInputs[0]
		if (!input) return
		setControls([...controls, createControl(input, controls)])
	}

	if (!isEntry) return null

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => {
			if (!nextOpen) onClose()
		}}>
			<DialogContent
				data-id="configuration-panel-editor"
				className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0"
			>
				<DialogHeader className="border-b border-border px-6 py-5">
					<DialogTitle>Configuration panel</DialogTitle>
					<DialogDescription>
						Map root assembly inputs to the controls shown in the product configurator.
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto p-6">
					<div className="mb-4 flex items-center justify-between gap-4">
						<div className="text-xs text-muted-foreground">
							{controls.length} {controls.length === 1 ? 'control' : 'controls'}
						</div>
						<Button
							data-id="add-configuration-control"
							type="button"
							variant="outline"
							size="sm"
							disabled={availableInputs.length === 0}
							onClick={addControl}
						>
							<Plus />
							Add control
						</Button>
					</div>

					{inputs.length === 0 ? (
						<EmptyState>
							Add number, enum, or color input nodes to the root assembly first.
						</EmptyState>
					) : controls.length === 0 ? (
						<EmptyState>
							No inputs are mapped yet. Add a control to build the configuration panel.
						</EmptyState>
					) : (
						<div className="flex flex-col gap-3" data-id="configuration-control-list">
							{controls.map((control, index) => {
								const input = inputs.find((candidate) => candidate.id === control.inputId)
								if (!input) return null
								return (
									<ControlEditor
										key={control.id}
										control={control}
										input={input}
										inputs={inputs}
										controls={controls}
										index={index}
										onChange={(next) => updateControl(control.id, () => next)}
										onRemove={() => setControls(
											controls.filter((candidate) => candidate.id !== control.id)
										)}
										onMove={(offset) => {
											const target = index + offset
											if (target < 0 || target >= controls.length) return
											const next = [...controls]
											const [moved] = next.splice(index, 1)
											next.splice(target, 0, moved)
											setControls(next)
										}}
									/>
								)
							})}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function EmptyState({ children }: { children: string }) {
	return (
		<div
			data-id="configuration-panel-editor-empty"
			className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
		>
			{children}
		</div>
	)
}

function ControlEditor({
	control,
	input,
	inputs,
	controls,
	index,
	onChange,
	onRemove,
	onMove,
}: {
	control: ConfigurationPanelControl
	input: GraphInputDefinition
	inputs: GraphInputDefinition[]
	controls: ConfigurationPanelControl[]
	index: number
	onChange: (control: ConfigurationPanelControl) => void
	onRemove: () => void
	onMove: (offset: number) => void
}) {
	const compatibleTypes = getCompatibleControlTypes(input)

	return (
		<div
			data-id={`configuration-control-${control.id}`}
			className="rounded-md border border-border bg-surface p-4"
		>
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<Label className="mb-1 text-xs text-muted-foreground">Assembly input</Label>
					<Select
						value={input.id}
						onValueChange={(inputId) => {
							const nextInput = inputs.find((candidate) => candidate.id === inputId)
							if (nextInput) onChange(createControl(nextInput, controls, control.id))
						}}
					>
						<SelectTrigger
							data-id={`configuration-control-input-${control.id}`}
							className="h-8 text-xs"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{inputs.map((candidate) => {
								const used = controls.some(
									(existing) =>
										existing.id !== control.id && existing.inputId === candidate.id
								)
								return (
									<SelectItem key={candidate.id} value={candidate.id} disabled={used}>
										{candidate.label || candidate.id} ({candidate.valueType})
									</SelectItem>
								)
							})}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label className="mb-1 text-xs text-muted-foreground">Control type</Label>
					<Select
						value={control.type}
						onValueChange={(type) => onChange({
							...createControl(input, controls, control.id, type as ControlType),
							label: control.label,
						})}
					>
						<SelectTrigger
							data-id={`configuration-control-type-${control.id}`}
							className="h-8 text-xs"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{compatibleTypes.map((type) => (
								<SelectItem key={type} value={type}>{controlTypeLabels[type]}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="sm:col-span-2">
					<Label className="mb-1 text-xs text-muted-foreground">Label</Label>
					<Input
						data-id={`configuration-control-label-${control.id}`}
						className="h-8 text-xs"
						value={control.label}
						onChange={(event) => onChange({ ...control, label: event.target.value })}
					/>
				</div>
			</div>

			{control.type === 'number' && (
				<div className="mt-3 w-36">
					<NumberSetting
						id={`${control.id}-step`}
						label="Step"
						value={control.step}
						onChange={(step) => onChange({ ...control, step: positive(step, control.step) })}
					/>
				</div>
			)}

			{control.type === 'slider' && (
				<div className="mt-3 grid grid-cols-3 gap-3">
					<NumberSetting
						id={`${control.id}-min`}
						label="Minimum"
						value={control.min}
						onChange={(min) => {
							if (min < control.max) onChange({ ...control, min })
						}}
					/>
					<NumberSetting
						id={`${control.id}-max`}
						label="Maximum"
						value={control.max}
						onChange={(max) => {
							if (max > control.min) onChange({ ...control, max })
						}}
					/>
					<NumberSetting
						id={`${control.id}-step`}
						label="Step"
						value={control.step}
						onChange={(step) => onChange({ ...control, step: positive(step, control.step) })}
					/>
				</div>
			)}

			<div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					disabled={index === 0}
					onClick={() => onMove(-1)}
					aria-label={`Move ${control.label} up`}
				>
					<ArrowUp />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					disabled={index === controls.length - 1}
					onClick={() => onMove(1)}
					aria-label={`Move ${control.label} down`}
				>
					<ArrowDown />
				</Button>
				<Button
					data-id={`remove-configuration-control-${control.id}`}
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
					aria-label={`Remove ${control.label}`}
				>
					<Trash2 />
				</Button>
			</div>
		</div>
	)
}

function NumberSetting({
	id,
	label,
	value,
	onChange,
}: {
	id: string
	label: string
	value: number
	onChange: (value: number) => void
}) {
	return (
		<div>
			<Label className="mb-1 text-xs text-muted-foreground">{label}</Label>
			<DraftNumberInput
				data-id={`configuration-control-${id}`}
				className="h-8 text-xs"
				value={value}
				onValueChange={onChange}
			/>
		</div>
	)
}

type ControlType = ConfigurationPanelControl['type']

const controlTypeLabels: Record<ControlType, string> = {
	number: 'Number field',
	slider: 'Slider',
	select: 'Select',
	color: 'Color picker',
}

function getCompatibleControlTypes(input: GraphInputDefinition): ControlType[] {
	if (input.valueType === 'number') return ['number', 'slider']
	if (input.valueType === 'enum') return ['select']
	if (input.valueType === 'color') return ['color']
	return []
}

function createControl(
	input: GraphInputDefinition,
	controls: ConfigurationPanelControl[],
	id = createControlId(input.id, controls),
	requestedType?: ControlType
): ConfigurationPanelControl {
	const compatibleTypes = getCompatibleControlTypes(input)
	const type = requestedType && compatibleTypes.includes(requestedType)
		? requestedType
		: compatibleTypes[0]
	const base = { id, inputId: input.id, label: input.label }
	if (type === 'slider') {
		const value = typeof input.defaultValue === 'number' ? input.defaultValue : 0
		return { ...base, type, min: Math.min(0, value), max: Math.max(100, value), step: 1 }
	}
	if (type === 'number') return { ...base, type, step: 0.1 }
	if (type === 'select') return { ...base, type }
	return { ...base, type: 'color' }
}

function createControlId(inputId: string, controls: ConfigurationPanelControl[]): string {
	const base = `${inputId}-control`
	if (!controls.some((control) => control.id === base)) return base
	let sequence = 2
	while (controls.some((control) => control.id === `${base}-${sequence}`)) sequence += 1
	return `${base}-${sequence}`
}

function positive(value: number, fallback: number): number {
	return Number.isFinite(value) && value > 0 ? value : fallback
}
