import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ConfigurationFields } from '@/parametric/components/ConfigurationFields'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { createConfigurationFields } from '@/parametric/model/createConfigurationFields'
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react'

export function LayoutConfigurationsPanel() {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const layoutData = document.getLayout()
	const product = layoutData.products.find((item) => item.id === layoutData.activeProductId)
	if (!product) {
		throw new Error(
			`Current configurations cannot find active product "${layoutData.activeProductId}". ` +
				`Available products: ${JSON.stringify(layoutData.products.map((item) => item.id))}.`
		)
	}
	const layout = layoutData.layouts.find((item) => item.id === product.layoutId)
	if (!layout) throw new Error(`Product "${product.id}" references unknown layout "${product.layoutId}".`)
	const slot = layoutData.slots.find((item) => item.id === layout.slotId)
	if (!slot) {
		throw new Error(
			`Current configurations cannot find slot definition "${layout.slotId}" for layout ` +
				`"${layout.id}". Available slot definitions: ` +
				`${JSON.stringify(layoutData.slots.map((item) => item.id))}.`
		)
	}
	const canAdd = product.instances.length < layout.slotsCount.max && slot.graphs.length > 0

	return (
		<aside
			data-id="layout-current-configurations-panel"
			className="flex h-full w-96 shrink-0 flex-col border-r border-border bg-surface"
		>
			<div className="border-b border-border p-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="flex items-center gap-2 text-sm font-semibold">
						<SlidersHorizontal className="size-4" aria-hidden="true" />
						{layout.configurationHeader}
					</h2>
				</div>
			</div>
			<div data-id="layout-current-configurations-list" className="min-h-0 flex-1 overflow-y-auto p-3">
				{product.instances.length === 0 && (
					<p data-id="layout-empty-configurations" className="text-sm text-muted-foreground">
						Nothing added yet.
					</p>
				)}
				<div className="space-y-3">
					{product.instances.map((instance, index) => {
						const fields = createConfigurationFields(document, instance.graphId, instance.inputValues)
						return (
							<div
								key={instance.id}
								data-id={`layout-instance-${instance.id}`}
								className="space-y-3 rounded-md border border-border p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-medium">Item {index + 1}</h3>
									<Button
										data-id={`delete-layout-instance-${instance.id}`}
										type="button"
										variant="ghost"
										size="icon"
										aria-label={`Remove item ${index + 1}`}
										onClick={() => controller.removeProductInstance(product.id, instance.id)}
									>
										<Trash2 />
									</Button>
								</div>
								{fields.length > 0 ? (
									<ConfigurationFields
										fields={fields}
										idPrefix={`layout-${instance.id}`}
										onValueChange={(inputId, value) =>
											controller.setProductInstanceInputValue(
												product.id,
												instance.id,
												inputId,
												value
											)
										}
									/>
								) : (
									<p className="text-xs text-muted-foreground">No options available.</p>
								)}
							</div>
						)
					})}
				</div>
				<Separator className="my-3" />
				<Button
					data-id="add-layout-instance"
					type="button"
					className="w-full"
					variant="outline"
					disabled={!canAdd}
					onClick={() => controller.addDefaultProductInstance(product.id)}
				>
					<Plus />
					Add item
				</Button>
				{slot.graphs.length === 0 && (
					<p data-id="layout-no-allowed-graphs" className="mt-2 text-xs text-destructive">
						No products are available. Update Product options first.
					</p>
				)}
			</div>
		</aside>
	)
}
