import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/parametric/components/NumericInput'
import { Slider } from '@/components/ui/slider'
import { ConfigurationFields } from '@/parametric/components/ConfigurationFields'
import { resolveProductConfiguration } from '@/layout/ProductConfigurationResolver'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function LayoutConfigurationsPanel() {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const product = document.getLayout().products.find((item) => item.id === document.getLayout().activeProductId)
	if (!product) throw new Error(`Current configurations cannot find active product "${document.getLayout().activeProductId}".`)
	const configuration = resolveProductConfiguration(document, product.id)

	return (
		<aside data-id="layout-current-configurations-panel" className="flex h-full w-96 shrink-0 flex-col border-r border-border bg-surface">
			<div className="border-b border-border p-3">
				<h2 className="flex items-center gap-2 text-sm font-semibold">
					<SlidersHorizontal className="size-4" aria-hidden="true" />
					{configuration.header}
				</h2>
			</div>
			<div data-id="layout-current-configurations-list" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
				{configuration.controls.map((control) => control.type === 'field' ? (
					<ConfigurationFields
						key={control.id}
						fields={[control.field]}
						idPrefix={`product-${product.id}-${control.id}`}
						onValueChange={(_, value) => controller.setProductConfigurationControlValue(product.id, control.id, value)}
					/>
				) : (
					<section key={control.id} data-id={`product-section-list-${control.id}`} className="space-y-3">
						<h3 className="text-sm font-medium">{control.label}</h3>
						{control.sections.map((section, index) => (
							<div key={index} className="space-y-2 rounded-md border border-border p-3">
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm font-medium">Section {index + 1}</span>
									<Button data-id={`delete-product-section-${control.id}-${index}`} type="button" variant="ghost" size="icon" aria-label={`Remove section ${index + 1}`} onClick={() => controller.removeProductConfigurationSection(product.id, control.id, index)}><Trash2 /></Button>
								</div>
								{control.fields.map((field) => (
									<div key={field.id} className="grid grid-cols-[1fr_9rem] items-center gap-2">
										<Label className="text-xs text-muted-foreground">{field.label}</Label>
										<SectionValueInput field={field} value={section[field.id] ?? 0} onChange={(value) => controller.setProductConfigurationSectionValue(product.id, control.id, field.id, index, value)} />
									</div>
								))}
							</div>
						))}
						<Button data-id={`add-product-section-${control.id}`} type="button" className="w-full" variant="outline" onClick={() => controller.addProductConfigurationSection(product.id, control.id)}><Plus />Add section</Button>
					</section>
				))}
				{configuration.controls.length === 0 && <p className="text-sm text-muted-foreground">No options available.</p>}
			</div>
		</aside>
	)
}

function SectionValueInput({ field, value, onChange }: {
	field: Extract<ReturnType<typeof resolveProductConfiguration>['controls'][number], { type: 'sectionList' }>['fields'][number]
	value: number
	onChange: (value: number) => void
}) {
	if (field.widget === 'select' && field.field.type === 'primitiveArray') {
		return <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}><SelectTrigger data-id={`product-section-select-${field.id}`} className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{field.field.options.map((option, index) => <SelectItem key={index} value={String(index)}>{option}</SelectItem>)}</SelectContent></Select>
	}
	if (field.widget === 'slider') {
		return (
			<div data-id={`product-section-slider-${field.id}`} className="grid grid-cols-[1fr_auto] items-center gap-2">
				<Slider
					data-id={`product-section-slider-control-${field.id}`}
					value={[value]}
					min={field.min}
					max={field.max}
					step={field.step}
					onValueChange={([next]) => next !== undefined && onChange(next)}
				/>
				<span
					data-id={`product-section-slider-value-${field.id}`}
					className="min-w-8 text-right text-xs tabular-nums text-foreground"
				>
					{value}
				</span>
			</div>
		)
	}
	return <NumericInput data-id={`product-section-number-${field.id}`} className="h-8 w-full px-2 text-xs" value={value} min={field.min} max={field.max} step={field.step ?? 0.1} onValueChange={onChange} />
}
