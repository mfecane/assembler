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
import { Switch } from '@/components/ui/switch'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
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
	const controller = useEditorController()
	const { document: graphDocument, activeGraphId } = useGraphSnapshot()
	const isEntry = activeGraphId === graphDocument.getEntryGraphId()
	const inputs = graphDocument.getEntryGraph().inputs.filter(
		(input) => input.valueType !== 'geometry'
	)
	const controls = graphDocument.getConfigurationControls()

	const setControls = (next: ConfigurationPanelControl[]) => {
		controller.setConfigurationControls(next)
	}

	const updateControl = (
		controlId: string,
		update: (control: ConfigurationPanelControl) => ConfigurationPanelControl
	) => {
		setControls(controls.map((control) => control.id === controlId ? update(control) : control))
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
						Choose which root assembly inputs appear in the product configurator.
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto p-6">
					<div className="mb-4 text-xs text-muted-foreground">
						{controls.length} of {inputs.length} enabled
					</div>

					{inputs.length === 0 ? (
						<EmptyState>
							Add number, enum, or color input nodes to the root assembly first.
						</EmptyState>
					) : (
						<div className="flex flex-col gap-3" data-id="configuration-control-list">
							{inputs.map((input) => {
								const control = controls.find((candidate) => candidate.inputId === input.id)
								return (
									<InputControlSection
										key={input.id}
										control={control}
										input={input}
										controls={controls}
										onEnable={() => setControls([...controls, createControl(input, controls)])}
										onDisable={() => setControls(
											controls.filter((candidate) => candidate.inputId !== input.id)
										)}
										onChange={(next) => {
											if (control) updateControl(control.id, () => next)
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

function InputControlSection({
	control,
	input,
	controls,
	onEnable,
	onDisable,
	onChange,
}: {
	control?: ConfigurationPanelControl
	input: GraphInputDefinition
	controls: ConfigurationPanelControl[]
	onEnable: () => void
	onDisable: () => void
	onChange: (control: ConfigurationPanelControl) => void
}) {
	const switchId = `configuration-input-enabled-${input.id}`

	return (
		<div
			data-id={`configuration-input-${input.id}`}
			className="overflow-hidden rounded-md border border-border bg-surface"
		>
			<div className="flex items-center justify-between gap-4 px-4 py-3">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">{input.label || input.id}</div>
					<div className="text-xs text-muted-foreground">{input.valueType} input</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Label htmlFor={switchId} className="cursor-pointer text-xs text-muted-foreground">
						{control ? 'Enabled' : 'Disabled'}
					</Label>
					<Switch
						id={switchId}
						data-id={`configuration-input-switch-${input.id}`}
						checked={Boolean(control)}
						onCheckedChange={(checked) => checked ? onEnable() : onDisable()}
						aria-label={`${control ? 'Disable' : 'Enable'} ${input.label || input.id}`}
					/>
				</div>
			</div>

			{control && (
				<ControlEditor
					control={control}
					input={input}
					controls={controls}
					onChange={onChange}
				/>
			)}
		</div>
	)
}

function ControlEditor({
	control,
	input,
	controls,
	onChange,
}: {
	control: ConfigurationPanelControl
	input: GraphInputDefinition
	controls: ConfigurationPanelControl[]
	onChange: (control: ConfigurationPanelControl) => void
}) {
	const compatibleTypes = getCompatibleControlTypes(input)

	return (
		<div
			data-id={`configuration-control-${control.id}`}
			className="border-t border-border bg-muted/20 p-4"
		>
			<div className="grid gap-3 sm:grid-cols-2">

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
