import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type {
	ProductConfigurationControl,
	ProductConfigurationDocument,
	ProductDocument,
} from '@/layout/LayoutDocument'
import {
	ConfigurationControlEditor,
	type ConfigurationBindingCandidate,
} from '@/layout/ProductConfigurationControlEditor'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { idGenerator } from '@/parametric/model/IdGenerator'
import { ListPlus, Plus, Settings2, X } from 'lucide-react'

export function ProductConfigurationDialog({ product }: { product: ProductDocument }) {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const [open, setOpen] = useState(false)
	const [draft, setDraft] = useState<ProductConfigurationDocument | null>(null)
	const [scalarTargetKey, setScalarTargetKey] = useState('')
	const [sectionBuilderOpen, setSectionBuilderOpen] = useState(false)
	const [sectionCountKey, setSectionCountKey] = useState('')
	const [sectionFieldKeys, setSectionFieldKeys] = useState<string[]>([])
	const candidates = useMemo<ConfigurationBindingCandidate[]>(() => product.instances.flatMap(
		(instance, itemIndex) => {
			const graph = document.requireGraph(instance.graphId)
			return graph.inputs.map((input) => ({
				key: `${instance.id}:${input.id}`,
				instanceId: instance.id,
				itemLabel: `Item ${itemIndex + 1} · ${graph.label}`,
				input,
			}))
		}
	), [document, product.instances])
	const configuration = draft ?? createDefaultConfiguration(product.label)
	const boundTargetKeys = getBoundTargetKeys(configuration.controls)
	const scalarCandidates = candidates.filter((candidate) => (
		!boundTargetKeys.has(candidate.key) && getDefaultScalarWidget(candidate.input.valueType) !== null
	))
	const selectedScalarCandidate = scalarCandidates.find((candidate) => candidate.key === scalarTargetKey)
	const sectionCountCandidates = candidates.filter((candidate) => (
		candidate.input.valueType === 'number'
		&& !boundTargetKeys.has(candidate.key)
		&& candidates.some((fieldCandidate) => (
			fieldCandidate.instanceId === candidate.instanceId
			&& isSectionFieldCandidate(fieldCandidate)
			&& !boundTargetKeys.has(fieldCandidate.key)
		))
	))
	const selectedSectionCount = sectionCountCandidates.find((candidate) => candidate.key === sectionCountKey)
	const sectionFieldCandidates = selectedSectionCount
		? candidates.filter((candidate) => (
			candidate.instanceId === selectedSectionCount.instanceId
			&& isSectionFieldCandidate(candidate)
			&& !boundTargetKeys.has(candidate.key)
		))
		: []
	const validationMessage = getConfigurationValidationMessage(configuration)

	const updateControls = (controls: ProductConfigurationControl[]) => {
		setDraft({ ...configuration, controls })
	}
	const resetComposer = () => {
		setScalarTargetKey('')
		setSectionBuilderOpen(false)
		setSectionCountKey('')
		setSectionFieldKeys([])
	}
	const openDialog = () => {
		setDraft(structuredClone(product.configuration ?? createDefaultConfiguration(product.label)))
		resetComposer()
		setOpen(true)
	}
	const closeDialog = () => {
		setOpen(false)
		setDraft(null)
		resetComposer()
	}
	const addScalarControl = () => {
		const candidate = scalarCandidates.find((item) => item.key === scalarTargetKey)
		if (!candidate) return
		const type = getDefaultScalarWidget(candidate.input.valueType)
		if (!type) return
		const settings = type === 'slider' ? { min: 0, max: 1, step: 0.1 } : {}
		updateControls([...configuration.controls, {
			id: idGenerator.create('control'),
			type,
			label: candidate.input.label,
			target: { instanceId: candidate.instanceId, inputId: candidate.input.id },
			...settings,
		}])
		setScalarTargetKey('')
	}
	const startSectionBuilder = () => {
		setSectionBuilderOpen(true)
		setSectionCountKey('')
		setSectionFieldKeys([])
	}
	const cancelSectionBuilder = () => {
		setSectionBuilderOpen(false)
		setSectionCountKey('')
		setSectionFieldKeys([])
	}
	const selectSectionCount = (key: string) => {
		setSectionCountKey(key)
		setSectionFieldKeys([])
	}
	const toggleSectionField = (key: string) => {
		setSectionFieldKeys((current) => current.includes(key)
			? current.filter((item) => item !== key)
			: [...current, key]
		)
	}
	const addSectionControl = () => {
		if (!selectedSectionCount || sectionFieldKeys.length === 0) return
		const fields = sectionFieldKeys.map((key) => {
			const candidate = sectionFieldCandidates.find((item) => item.key === key)
			if (!candidate) {
				throw new Error(
					`Cannot add Sections to product "${product.id}": selected field binding "${key}" `
					+ `is not available for count binding "${selectedSectionCount.key}".`
				)
			}
			return {
				id: idGenerator.create('field'),
				label: candidate.input.label,
				target: { instanceId: candidate.instanceId, inputId: candidate.input.id },
				widget: candidate.input.enumId ? 'select' as const : 'number' as const,
			}
		})
		updateControls([...configuration.controls, {
			id: idGenerator.create('section'),
			type: 'sectionList',
			label: 'Sections',
			countTarget: {
				instanceId: selectedSectionCount.instanceId,
				inputId: selectedSectionCount.input.id,
			},
			fields,
		}])
		cancelSectionBuilder()
	}

	return (
		<>
			<Button
				data-id="edit-product-configuration"
				type="button"
				variant="outline"
				className="w-full"
				onClick={openDialog}
			>
				<Settings2 />
				Edit configuration
			</Button>
			<Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : closeDialog()}>
				<DialogContent
					data-id="product-configuration-dialog"
					className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden"
				>
					<DialogHeader>
						<DialogTitle>Configuration panel · {product.label}</DialogTitle>
						<DialogDescription>
							Choose which product inputs appear in the customer panel and how they are presented.
						</DialogDescription>
					</DialogHeader>

					<div data-id="product-configuration-dialog-body" className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
						<div className="space-y-2">
							<Label htmlFor="product-configuration-header">Panel heading</Label>
							<Input
								id="product-configuration-header"
								data-id="product-configuration-header"
								value={configuration.header}
								onChange={(event) => setDraft({ ...configuration, header: event.target.value })}
							/>
						</div>

						<section data-id="product-configuration-controls" className="space-y-3">
							<div>
								<h3 className="text-sm font-medium">Controls</h3>
								<p className="text-xs text-muted-foreground">
									The order here is the order customers see.
								</p>
							</div>
							{configuration.controls.length === 0 && (
								<div className="rounded-md border border-dashed p-6 text-center">
									<p className="text-sm font-medium">No controls yet</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Add a product input or build a repeatable Sections control.
									</p>
								</div>
							)}
							{configuration.controls.map((control, index) => (
								<ConfigurationControlEditor
									key={control.id}
									control={control}
									candidates={candidates}
									boundTargetKeys={boundTargetKeys}
									index={index}
									controlCount={configuration.controls.length}
									onChange={(next) => updateControls(configuration.controls.map((item) => (
										item.id === next.id ? next : item
									)))}
									onMove={(to) => updateControls(move(configuration.controls, index, to))}
									onRemove={() => updateControls(configuration.controls.filter((item) => item.id !== control.id))}
								/>
							))}
						</section>

						<section data-id="product-configuration-add-control" className="space-y-3 rounded-md border bg-muted/30 p-3">
							<div>
								<h3 className="text-sm font-medium">Add control</h3>
								<p className="text-xs text-muted-foreground">
									Choose the product input first. A suitable control is selected automatically.
								</p>
							</div>
							<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
								<Select
									value={scalarTargetKey}
									disabled={scalarCandidates.length === 0}
									onValueChange={setScalarTargetKey}
								>
									<SelectTrigger data-id="product-configuration-scalar-target">
										<SelectValue placeholder={scalarCandidates.length > 0 ? 'Choose a product input' : 'No inputs available'}>
											{selectedScalarCandidate
												? `${selectedScalarCandidate.itemLabel} · ${selectedScalarCandidate.input.label}`
												: undefined}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>{renderCandidateGroups(scalarCandidates)}</SelectContent>
								</Select>
								<Button type="button" disabled={!scalarTargetKey} onClick={addScalarControl}>
									<Plus /> Add
								</Button>
							</div>

							{!sectionBuilderOpen && (
								<Button
									data-id="start-product-sections-control"
									type="button"
									variant="outline"
									className="w-full"
									disabled={sectionCountCandidates.length === 0}
									onClick={startSectionBuilder}
								>
									<ListPlus /> Add Sections
								</Button>
							)}
							{!sectionBuilderOpen && sectionCountCandidates.length === 0 && (
								<p className="text-xs text-muted-foreground">
									Sections needs an unused number input and at least one numeric or choice array
									from the same product item.
								</p>
							)}
							{sectionBuilderOpen && (
								<div data-id="product-sections-composer" className="space-y-3 rounded-md border bg-background p-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<h4 className="text-sm font-medium">Build Sections</h4>
											<p className="text-xs text-muted-foreground">
												Bind the item count and every per-section value this control owns.
											</p>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Cancel adding Sections"
											onClick={cancelSectionBuilder}
										>
											<X />
										</Button>
									</div>
									<div className="space-y-2">
										<Label>Section count input</Label>
										<Select value={sectionCountKey} onValueChange={selectSectionCount}>
											<SelectTrigger data-id="product-sections-count-target">
												<SelectValue placeholder="Choose a number input">
													{selectedSectionCount
														? `${selectedSectionCount.itemLabel} · ${selectedSectionCount.input.label}`
														: undefined}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>{renderCandidateGroups(sectionCountCandidates)}</SelectContent>
										</Select>
									</div>
									{selectedSectionCount && (
										<div className="space-y-2">
											<Label>Per-section values</Label>
											<div className="space-y-1 rounded-md border p-2">
												{sectionFieldCandidates.map((candidate) => (
													<label
														key={candidate.key}
														className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
													>
														<Checkbox
															data-id={`product-sections-field-${candidate.key}`}
															checked={sectionFieldKeys.includes(candidate.key)}
															onCheckedChange={() => toggleSectionField(candidate.key)}
														/>
														<span>{candidate.input.label}</span>
													</label>
												))}
											</div>
										</div>
									)}
									<Button
										data-id="add-product-sections-control"
										type="button"
										className="w-full"
										disabled={!selectedSectionCount || sectionFieldKeys.length === 0}
										onClick={addSectionControl}
									>
										<Plus /> Add Sections
									</Button>
								</div>
							)}
						</section>
					</div>

					<DialogFooter className="border-t pt-4">
						{validationMessage && (
							<p data-id="product-configuration-validation" className="mr-auto self-center text-left text-xs text-destructive">
								{validationMessage}
							</p>
						)}
						<Button type="button" variant="outline" onClick={closeDialog}>Discard</Button>
						<Button
							data-id="save-product-configuration"
							type="button"
							disabled={validationMessage !== null}
							onClick={() => {
								controller.setProductConfiguration(product.id, configuration)
								closeDialog()
							}}
						>
							Save changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

function createDefaultConfiguration(productLabel: string): ProductConfigurationDocument {
	return { header: `Configure ${productLabel}`, controls: [] }
}

function getDefaultScalarWidget(valueType: string): Exclude<ProductConfigurationControl['type'], 'sectionList'> | null {
	if (valueType === 'number') return 'number'
	if (valueType === 'enum') return 'select'
	if (valueType === 'materialInstance') return 'material'
	if (valueType === 'boolean') return 'switch'
	if (valueType === 'color') return 'color'
	if (valueType === 'vector3') return 'vector3'
	return null
}

function isSectionFieldCandidate(candidate: ConfigurationBindingCandidate): boolean {
	return candidate.input.valueType === 'primitiveArray'
		&& Array.isArray(candidate.input.defaultValue)
		&& typeof candidate.input.defaultValue[0] === 'number'
		&& candidate.input.defaultValue.every((value) => typeof value === 'number')
}

function getBoundTargetKeys(controls: ProductConfigurationControl[]): Set<string> {
	return new Set(controls.flatMap((control) => control.type === 'sectionList'
		? [
			`${control.countTarget.instanceId}:${control.countTarget.inputId}`,
			...control.fields.map((field) => `${field.target.instanceId}:${field.target.inputId}`),
		]
		: [`${control.target.instanceId}:${control.target.inputId}`]
	))
}

function renderCandidateGroups(candidates: ConfigurationBindingCandidate[]) {
	return [...new Set(candidates.map((candidate) => candidate.itemLabel))].map((itemLabel) => (
		<SelectGroup key={itemLabel}>
			<SelectLabel>{itemLabel}</SelectLabel>
			{candidates.filter((candidate) => candidate.itemLabel === itemLabel).map((candidate) => (
				<SelectItem key={candidate.key} value={candidate.key}>{candidate.input.label}</SelectItem>
			))}
		</SelectGroup>
	))
}

function getConfigurationValidationMessage(configuration: ProductConfigurationDocument): string | null {
	if (!configuration.header.trim()) return 'Panel heading is required before this configuration can be saved.'
	for (const [controlIndex, control] of configuration.controls.entries()) {
		const context = `Control ${controlIndex + 1} (${control.type})`
		if (!control.label.trim()) return `${context} needs a customer-facing label.`
		if (control.type === 'sectionList') {
			if (control.fields.length === 0) return `${context} must own at least one per-section value.`
			for (const [fieldIndex, field] of control.fields.entries()) {
				if (!field.label.trim()) return `${context}, field ${fieldIndex + 1} needs a customer-facing label.`
				const error = getNumericSettingsError(field.widget, field.min, field.max, field.step)
				if (error) return `${context}, field "${field.label}": ${error}`
			}
			continue
		}
		if (control.type === 'number' || control.type === 'slider') {
			const error = getNumericSettingsError(control.type, control.min, control.max, control.step)
			if (error) return `${context} "${control.label}": ${error}`
		}
	}
	return null
}

function getNumericSettingsError(
	widget: 'number' | 'slider' | 'select',
	min: number | undefined,
	max: number | undefined,
	step: number | undefined
): string | null {
	if (widget === 'select') return null
	if (min !== undefined && !Number.isFinite(min)) return 'minimum must be a finite number.'
	if (max !== undefined && !Number.isFinite(max)) return 'maximum must be a finite number.'
	if (min !== undefined && max !== undefined && min >= max) return 'maximum must be greater than minimum.'
	if (widget === 'slider' && (min === undefined || max === undefined)) return 'slider requires minimum and maximum.'
	if (widget === 'slider' && (step === undefined || !Number.isFinite(step) || step <= 0)) {
		return 'slider step must be greater than zero.'
	}
	if (step !== undefined && (!Number.isFinite(step) || step <= 0)) return 'step must be greater than zero.'
	return null
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items]
	const [item] = next.splice(from, 1)
	if (item === undefined) return next
	next.splice(to, 0, item)
	return next
}
