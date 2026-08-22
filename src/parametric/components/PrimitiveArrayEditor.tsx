import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import type { PrimitiveArrayElementType } from '@/parametric/model/GraphNode'

type PrimitiveArrayValue = number | boolean

export function PrimitiveArrayEditor({ dataId, elementType, values, options, onChange, disabled = false }: {
	dataId: string
	elementType: PrimitiveArrayElementType
	values: PrimitiveArrayValue[]
	options: readonly string[]
	onChange: (values: PrimitiveArrayValue[]) => void
	disabled?: boolean
}) {
	const createValue = () => elementType === 'boolean' ? false : 0
	return (
		<div data-id={dataId} className="nodrag space-y-1.5">
			{values.map((value, index) => (
				<div key={index} className="flex h-8 items-center gap-1.5">
					{elementType === 'number' ? <NumericInput className="h-8 min-w-0 flex-1 px-2 text-xs"
						data-id={`${dataId}-value-${index}`} value={typeof value === 'number' ? value : 0}
						disabled={disabled}
						onValueChange={(next) => onChange(replaceValue(values, index, next))} />
					: elementType === 'enum' ? <Select value={String(typeof value === 'number' ? value : 0)}
						disabled={disabled}
						onValueChange={(next) => onChange(replaceValue(values, index, Number(next)))}>
						<SelectTrigger data-id={`${dataId}-value-${index}`} className="h-8 min-w-0 flex-1 text-xs"><SelectValue /></SelectTrigger>
						<SelectContent>{options.map((option, optionIndex) => (
							<SelectItem key={optionIndex} value={String(optionIndex)}>{option}</SelectItem>
						))}</SelectContent>
					</Select>
					: <Switch data-id={`${dataId}-value-${index}`} className="ml-auto"
						disabled={disabled}
						checked={value === true} onCheckedChange={(next) => onChange(replaceValue(values, index, next))} />}
					<Button data-id={`${dataId}-remove-${index}`} type="button" variant="ghost" size="icon"
						className="h-8 w-8 shrink-0 text-muted-foreground" disabled={disabled} onClick={() => onChange(
							values.filter((_, candidateIndex) => candidateIndex !== index)
						)} aria-label={`Remove value ${index + 1}`}><Trash2 /></Button>
				</div>
			))}
			<Button data-id={`${dataId}-add`} type="button" variant="outline" size="sm"
				className="h-7 w-full text-xs" disabled={disabled}
				onClick={() => onChange([...values, createValue()])}>
				<Plus />Add value
			</Button>
		</div>
	)
}

function replaceValue(values: PrimitiveArrayValue[], index: number, value: PrimitiveArrayValue) {
	return values.map((item, candidateIndex) => candidateIndex === index ? value : item)
}
