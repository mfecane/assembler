import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'

export function NumberArrayEditor({
	dataId,
	values,
	onChange,
	disabled = false,
}: {
	dataId: string
	values: number[]
	onChange: (values: number[]) => void
	disabled?: boolean
}) {
	return (
		<div data-id={dataId} className="nodrag space-y-1.5">
			{values.map((value, index) => (
				<div key={index} className="flex items-center gap-1.5">
					<DraftNumberInput
						data-id={`${dataId}-value-${index}`}
						className="h-8 min-w-0 flex-1 px-2 text-xs"
						value={value}
						min={0}
						step={1}
						disabled={disabled}
						onValueChange={(next) => onChange(values.map((item, candidateIndex) =>
							candidateIndex === index ? Math.max(0, next) : item
						))}
					/>
					<Button
						data-id={`${dataId}-remove-${index}`}
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0 text-muted-foreground"
						disabled={disabled || values.length === 1}
						onClick={() => onChange(values.filter((_, candidateIndex) => candidateIndex !== index))}
						aria-label={`Remove value ${index + 1}`}
					>
						<Trash2 />
					</Button>
				</div>
			))}
			<Button
				data-id={`${dataId}-add`}
				type="button"
				variant="outline"
				size="sm"
				className="h-7 w-full text-xs"
				disabled={disabled}
				onClick={() => onChange([...values, 0])}
			>
				<Plus />
				Add value
			</Button>
		</div>
	)
}
