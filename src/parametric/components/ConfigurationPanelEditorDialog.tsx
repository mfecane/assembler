import { useCallback, useRef, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
	GripVertical,
	Hash,
	ListFilter,
	Palette,
	Plus,
	SlidersHorizontal,
	ToggleRight,
	Trash2,
} from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { ConfigurationConstraintEditor } from '@/parametric/components/ConfigurationConstraintEditor'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { useSortableControl } from '@/parametric/hooks/useSortableControl'
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
	const [addOpen, setAddOpen] = useState(false)
	const [dragOrder, setDragOrder] = useState<string[] | null>(null)
	const dragOrderRef = useRef<string[] | null>(null)
	const isEntry = activeGraphId === graphDocument.getEntryGraphId()
	const inputs = graphDocument.getEntryGraph().inputs.filter(
		(input) => input.valueType !== 'geometry'
	)
	const controls = graphDocument.getConfigurationControls()
	const displayedControls = dragOrder
		? dragOrder.flatMap((id) => controls.find((control) => control.id === id) ?? [])
		: controls

	const setControls = (next: ConfigurationPanelControl[]) => {
		controller.setConfigurationControls(next)
	}

	const updateControl = (
		controlId: string,
		update: (control: ConfigurationPanelControl) => ConfigurationPanelControl
	) => {
		setControls(controls.map((control) => control.id === controlId ? update(control) : control))
	}

	const addControl = (type: ControlType) => {
		const input = findAvailableInput(type, inputs, controls)
		if (!input) return
		setControls([...controls, createControl(input, controls, undefined, type)])
		setAddOpen(false)
	}

	const startDragging = useCallback(() => {
		const order = controls.map((control) => control.id)
		dragOrderRef.current = order
		setDragOrder(order)
	}, [controls])

	const moveControl = useCallback((sourceIndex: number, targetIndex: number) => {
		const current = dragOrderRef.current
		if (!current) return
		const next = moveItem(current, sourceIndex, targetIndex)
		dragOrderRef.current = next
		setDragOrder(next)
	}, [])

	const finishDragging = useCallback(() => {
		const order = dragOrderRef.current
		dragOrderRef.current = null
		setDragOrder(null)
		if (!order || order.every((id, index) => controls[index]?.id === id)) return
		setControls(order.flatMap((id) => controls.find((control) => control.id === id) ?? []))
	}, [controls])

	if (!isEntry) return null

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => {
			if (!nextOpen) {
				setAddOpen(false)
				dragOrderRef.current = null
				setDragOrder(null)
				onClose()
			}
		}}>
			<DialogContent
				data-id="configuration-panel-editor"
				className="flex max-h-[85vh] max-w-3xl flex-col gap-0 p-0"
			>
				<DialogHeader className="border-b border-border px-6 py-5">
					<div className="flex items-start justify-between gap-4 pr-8">
						<div>
							<DialogTitle>Configuration panel</DialogTitle>
							<DialogDescription>
								Configure root input controls and cross-input value constraints.
							</DialogDescription>
						</div>
						<AddItemPopover
							open={addOpen}
							onOpenChange={setAddOpen}
							inputs={inputs}
							controls={controls}
							onAdd={addControl}
						/>
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6">
					<section data-id="configuration-control-editor" className="space-y-3">
						<div>
							<h3 className="text-sm font-semibold">UI items</h3>
							<p className="text-xs text-muted-foreground">
								Bind entry inputs to controls and drag them into display order.
							</p>
						</div>
						{inputs.length === 0 ? (
							<EmptyState>
								Add number, enum, color, or boolean input nodes to the root assembly first.
							</EmptyState>
						) : controls.length === 0 ? (
							<EmptyState>
								The panel has no UI items. Use Add item to create the first one.
							</EmptyState>
						) : (
							<DndProvider backend={HTML5Backend}>
								<div className="flex flex-col gap-3" data-id="configuration-control-list">
									{displayedControls.map((control, index) => {
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
												onDragStart={startDragging}
												onMove={moveControl}
												onDragEnd={finishDragging}
												onRemove={() => setControls(
													controls.filter((candidate) => candidate.id !== control.id)
												)}
												onChange={(next) => updateControl(control.id, () => next)}
											/>
										)
									})}
								</div>
							</DndProvider>
						)}
					</section>
					<Separator />
					<ConfigurationConstraintEditor />
				</div>
			</DialogContent>
		</Dialog>
	)
}

function AddItemPopover({
	open,
	onOpenChange,
	inputs,
	controls,
	onAdd,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	inputs: GraphInputDefinition[]
	controls: ConfigurationPanelControl[]
	onAdd: (type: ControlType) => void
}) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button data-id="configuration-add-item" size="sm">
					<Plus />
					Add item
				</Button>
			</PopoverTrigger>
			<PopoverContent
				data-id="configuration-item-types"
				align="end"
				className="w-64 p-2"
			>
				<div className="px-2 pb-2 pt-1 text-xs font-medium text-muted-foreground">
					Predefined UI items
				</div>
				<div className="flex flex-col gap-1">
					{controlTypes.map((type) => {
						const available = findAvailableInput(type, inputs, controls)
						return (
							<Button
								key={type}
								data-id={`configuration-add-${type}`}
								variant="ghost"
								className="h-auto justify-start px-2 py-2"
								disabled={!available}
								onClick={() => onAdd(type)}
							>
								<WidgetIcon type={type} />
								<span className="min-w-0 text-left">
									<span className="block text-sm">{controlTypeLabels[type]}</span>
									<span className="block truncate text-[10px] font-normal text-muted-foreground">
										{available
											? `Links to ${available.label || available.id}`
											: `No unused ${requiredInputLabel(type)} input`}
									</span>
								</span>
							</Button>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
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
	onDragStart,
	onMove,
	onDragEnd,
	onRemove,
	onChange,
}: {
	control: ConfigurationPanelControl
	input: GraphInputDefinition
	inputs: GraphInputDefinition[]
	controls: ConfigurationPanelControl[]
	index: number
	onDragStart: () => void
	onMove: (sourceIndex: number, targetIndex: number) => void
	onDragEnd: () => void
	onRemove: () => void
	onChange: (control: ConfigurationPanelControl) => void
}) {
	const { containerRef, handleRef, isDragging } = useSortableControl({
		id: control.id,
		index,
		onDragStart,
		onMove,
		onDragEnd,
	})
	const compatibleTypes = getCompatibleControlTypes(input)
	const linkedInputs = inputs.filter((candidate) => (
		isInputCompatibleWithType(candidate, control.type)
		&& (
			candidate.id === control.inputId
			|| !controls.some((existing) => existing.inputId === candidate.id)
		)
	))

	return (
		<div
			ref={containerRef}
			data-id={`configuration-control-${control.id}`}
			className={isDragging
				? 'overflow-hidden rounded-md border border-primary/50 bg-surface opacity-50'
				: 'overflow-hidden rounded-md border border-border bg-surface'}
		>
			<div className="flex items-center gap-2 border-b border-border px-3 py-2">
				<Button
					ref={handleRef}
					data-id={`configuration-drag-${control.id}`}
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 cursor-grab text-muted-foreground active:cursor-grabbing"
					aria-label={`Reorder ${control.label || controlTypeLabels[control.type]}`}
				>
					<GripVertical />
				</Button>
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<WidgetIcon type={control.type} />
					<div className="min-w-0">
						<div className="truncate text-sm font-medium">
							{control.label || controlTypeLabels[control.type]}
						</div>
						<div className="truncate text-[10px] text-muted-foreground">
							{controlTypeLabels[control.type]} · {input.label || input.id}
						</div>
					</div>
				</div>
				<Button
					data-id={`configuration-remove-${control.id}`}
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
					aria-label={`Remove ${control.label || controlTypeLabels[control.type]}`}
				>
					<Trash2 />
				</Button>
			</div>

			<div className="grid gap-3 bg-muted/20 p-4 sm:grid-cols-2">
				<div>
					<Label className="mb-1 text-xs text-muted-foreground">Graph input</Label>
					<Select
						value={control.inputId}
						onValueChange={(inputId) => {
							const nextInput = inputs.find((candidate) => candidate.id === inputId)
							if (!nextInput) return
							onChange({ ...control, inputId, label: nextInput.label || inputId })
						}}
					>
						<SelectTrigger
							data-id={`configuration-control-input-${control.id}`}
							className="h-8 text-xs"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{linkedInputs.map((candidate) => (
								<SelectItem key={candidate.id} value={candidate.id}>
									{candidate.label || candidate.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label className="mb-1 text-xs text-muted-foreground">UI item</Label>
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

				{control.type === 'number' && (
					<div>
						<NumberSetting
							id={`${control.id}-step`}
							label="Step"
							value={control.step}
							onChange={(step) => onChange({ ...control, step: positive(step, control.step) })}
						/>
					</div>
				)}

				{control.type === 'slider' && (
					<div className="grid grid-cols-3 gap-3 sm:col-span-2">
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

const controlTypes: ControlType[] = ['number', 'slider', 'select', 'color', 'switch']

const controlTypeLabels: Record<ControlType, string> = {
	number: 'Number field',
	slider: 'Slider',
	select: 'Select',
	color: 'Color picker',
	switch: 'Switch',
}

function WidgetIcon({ type }: { type: ControlType }) {
	const Icon = type === 'number'
		? Hash
		: type === 'slider'
			? SlidersHorizontal
			: type === 'select'
				? ListFilter
				: type === 'color'
					? Palette
					: ToggleRight
	return <Icon className="shrink-0 text-muted-foreground" />
}

function getCompatibleControlTypes(input: GraphInputDefinition): ControlType[] {
	if (input.valueType === 'number') return ['number', 'slider']
	if (input.valueType === 'enum') return ['select']
	if (input.valueType === 'color') return ['color']
	if (input.valueType === 'boolean') return ['switch']
	return []
}

function isInputCompatibleWithType(input: GraphInputDefinition, type: ControlType): boolean {
	return getCompatibleControlTypes(input).includes(type)
}

function findAvailableInput(
	type: ControlType,
	inputs: GraphInputDefinition[],
	controls: ConfigurationPanelControl[]
): GraphInputDefinition | undefined {
	return inputs.find((input) => (
		isInputCompatibleWithType(input, type)
		&& !controls.some((control) => control.inputId === input.id)
	))
}

function requiredInputLabel(type: ControlType): string {
	if (type === 'number' || type === 'slider') return 'number'
	if (type === 'select') return 'enum'
	if (type === 'color') return 'color'
	return 'boolean'
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
	const base = { id, inputId: input.id, label: input.label || input.id }
	if (type === 'slider') {
		const value = typeof input.defaultValue === 'number' ? input.defaultValue : 0
		return { ...base, type, min: Math.min(0, value), max: Math.max(100, value), step: 1 }
	}
	if (type === 'number') return { ...base, type, step: 0.1 }
	if (type === 'select') return { ...base, type }
	if (type === 'switch') return { ...base, type }
	return { ...base, type: 'color' }
}

function createControlId(inputId: string, controls: ConfigurationPanelControl[]): string {
	const base = `${inputId}-control`
	if (!controls.some((control) => control.id === base)) return base
	let sequence = 2
	while (controls.some((control) => control.id === `${base}-${sequence}`)) sequence += 1
	return `${base}-${sequence}`
}

function moveItem<T>(items: T[], sourceIndex: number, targetIndex: number): T[] {
	if (sourceIndex === targetIndex) return items
	const next = [...items]
	const [item] = next.splice(sourceIndex, 1)
	if (item === undefined) return items
	next.splice(targetIndex, 0, item)
	return next
}

function positive(value: number, fallback: number): number {
	return Number.isFinite(value) && value > 0 ? value : fallback
}
