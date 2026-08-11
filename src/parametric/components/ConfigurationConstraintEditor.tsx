import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { useConfigurationConstraintEditor } from '@/parametric/hooks/useConfigurationConstraintEditor'
import type { SumMaximumByEnumConstraintDefinition } from '@/parametric/model/ConfigurationConstraint'
import type { GraphInputDefinition } from '@/parametric/model/GraphDocumentModel'

export function ConfigurationConstraintEditor() {
	const editor = useConfigurationConstraintEditor()

	return (
		<section data-id="configuration-constraint-editor" className="space-y-3">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="text-sm font-semibold">Constraints</h3>
					<p className="text-xs text-muted-foreground">
						Limit the combined value of number inputs from a selected choice.
					</p>
				</div>
				<Button
					data-id="configuration-add-constraint"
					type="button"
					variant="outline"
					size="sm"
					disabled={!editor.canAddConstraint}
					onClick={editor.addConstraint}
				>
					<Plus />
					Add constraint
				</Button>
			</div>

			{editor.constraints.length === 0 ? (
				<div
					data-id="configuration-constraint-empty"
					className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground"
				>
					{editor.canAddConstraint
						? 'No constraints configured.'
						: 'Add at least two unused number inputs and one choice input to create a constraint.'}
				</div>
			) : (
				<div data-id="configuration-constraint-list" className="space-y-3">
					{editor.constraints.map((constraint, index) => (
						<ConstraintCard
							key={`${constraint.selectorInputId}-${constraint.inputIds.join('-')}`}
							constraint={constraint}
							index={index}
							enumInputs={editor.enumInputs}
							numberInputs={editor.numberInputs}
							enumOptions={editor.getEnumOptions(constraint.selectorInputId)}
							onRemove={() => editor.removeConstraint(index)}
							onSelectorChange={(inputId) => editor.setSelector(index, inputId)}
							onInputToggle={(inputId, checked) => (
								editor.toggleInput(index, inputId, checked)
							)}
							onInputMove={(inputId, direction) => (
								editor.moveInput(index, inputId, direction)
							)}
							onMaximumChange={(option, maximum) => (
								editor.setMaximum(index, option, maximum)
							)}
							isUsedByOtherConstraint={(inputId) => (
								editor.isUsedByOtherConstraint(index, inputId)
							)}
						/>
					))}
				</div>
			)}
		</section>
	)
}

function ConstraintCard({
	constraint,
	index,
	enumInputs,
	numberInputs,
	enumOptions,
	onRemove,
	onSelectorChange,
	onInputToggle,
	onInputMove,
	onMaximumChange,
	isUsedByOtherConstraint,
}: {
	constraint: SumMaximumByEnumConstraintDefinition
	index: number
	enumInputs: GraphInputDefinition[]
	numberInputs: GraphInputDefinition[]
	enumOptions: string[]
	onRemove: () => void
	onSelectorChange: (inputId: string) => void
	onInputToggle: (inputId: string, checked: boolean) => void
	onInputMove: (inputId: string, direction: -1 | 1) => void
	onMaximumChange: (option: string, maximum: number) => void
	isUsedByOtherConstraint: (inputId: string) => boolean
}) {
	const selector = enumInputs.find((input) => input.id === constraint.selectorInputId)
	if (!selector) {
		throw new Error(
			`Cannot render configuration constraint ${index + 1}: choice selector `
			+ `"${constraint.selectorInputId}" is missing from the active root graph.`
		)
	}
	const selectedInputs = constraint.inputIds.map((inputId) => {
		const input = numberInputs.find((candidate) => candidate.id === inputId)
		if (!input) {
			throw new Error(
				`Cannot render configuration constraint ${index + 1}: numeric input `
				+ `"${inputId}" is missing from the active root graph.`
			)
		}
		return input
	})
	const availableInputs = numberInputs.filter((input) => !constraint.inputIds.includes(input.id))

	return (
		<div
			data-id={`configuration-constraint-${index}`}
			className="overflow-hidden rounded-md border border-border bg-surface"
		>
			<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
				<div>
					<div className="text-sm font-medium">Total maximum by choice</div>
					<div className="text-[10px] text-muted-foreground">
						Earlier inputs keep priority when the maximum decreases.
					</div>
				</div>
				<Button
					data-id={`configuration-remove-constraint-${index}`}
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-destructive"
					onClick={onRemove}
					aria-label={`Remove constraint ${index + 1}`}
				>
					<Trash2 />
				</Button>
			</div>

			<div className="space-y-5 bg-muted/20 p-4">
				<div>
					<Label className="mb-1 text-xs text-muted-foreground">Maximum selector</Label>
					<Select value={selector.id} onValueChange={onSelectorChange}>
						<SelectTrigger
							data-id={`configuration-constraint-selector-${index}`}
							className="h-8 text-xs"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{enumInputs.map((input) => (
								<SelectItem key={input.id} value={input.id}>
									{input.label || input.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<div>
						<Label className="text-xs text-muted-foreground">Number inputs and priority</Label>
						<p className="text-[10px] text-muted-foreground">
							At least two are required. Top inputs are preserved first.
						</p>
					</div>
					{[...selectedInputs, ...availableInputs].map((input) => {
						const priorityIndex = constraint.inputIds.indexOf(input.id)
						const checked = priorityIndex >= 0
						const usedElsewhere = isUsedByOtherConstraint(input.id)
						const cannotRemove = checked && constraint.inputIds.length === 2
						return (
							<div
								key={input.id}
								data-id={`configuration-constraint-${index}-input-${input.id}`}
								className="flex min-h-8 items-center gap-2 rounded-md border border-border bg-background px-2"
							>
								<Checkbox
									data-id={`configuration-constraint-${index}-input-toggle-${input.id}`}
									id={`configuration-constraint-${index}-${input.id}`}
									checked={checked}
									disabled={usedElsewhere || cannotRemove}
									onCheckedChange={(next) => onInputToggle(input.id, next === true)}
								/>
								<Label
									htmlFor={`configuration-constraint-${index}-${input.id}`}
									className="min-w-0 flex-1 truncate text-xs"
								>
									{checked ? `${priorityIndex + 1}. ` : ''}{input.label || input.id}
								</Label>
								{checked && (
									<div className="flex items-center">
										<Button
											data-id={`configuration-constraint-${index}-move-up-${input.id}`}
											type="button"
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											disabled={priorityIndex === 0}
											onClick={() => onInputMove(input.id, -1)}
											aria-label={`Move ${input.label || input.id} up`}
										>
											<ArrowUp />
										</Button>
										<Button
											data-id={`configuration-constraint-${index}-move-down-${input.id}`}
											type="button"
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											disabled={priorityIndex === constraint.inputIds.length - 1}
											onClick={() => onInputMove(input.id, 1)}
											aria-label={`Move ${input.label || input.id} down`}
										>
											<ArrowDown />
										</Button>
									</div>
								)}
							</div>
						)
					})}
				</div>

				<div className="space-y-2">
					<Label className="text-xs text-muted-foreground">Maximum by option</Label>
					<div className="grid gap-2 sm:grid-cols-2">
						{enumOptions.map((option) => (
							<div key={option} className="grid grid-cols-[1fr_5rem] items-center gap-2">
								<Label
									htmlFor={`configuration-constraint-${index}-maximum-${option}`}
									className="truncate text-xs"
									title={option}
								>
									{option}
								</Label>
								<DraftNumberInput
									data-id={`configuration-constraint-${index}-maximum-${option}`}
									id={`configuration-constraint-${index}-maximum-${option}`}
									className="h-8 px-2 text-xs tabular-nums"
									value={constraint.maximums[option] as number}
									min={0}
									step={1}
									onValueChange={(maximum) => onMaximumChange(option, maximum)}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
