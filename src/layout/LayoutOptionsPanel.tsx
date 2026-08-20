import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { LayoutNumberSetting } from '@/layout/LayoutNumberSetting'
import { ProductSelectorControls } from '@/layout/ProductSelectorControls'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { SlotEditorDialog } from '@/slots/SlotEditorDialog'
import { Boxes, Settings2 } from 'lucide-react'

export function LayoutOptionsPanel() {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const layoutData = document.getLayout()
	const product = layoutData.products.find((item) => item.id === layoutData.activeProductId)
	if (!product) {
		throw new Error(
			`Product options cannot find active product "${layoutData.activeProductId}". Available products: ` +
				`${JSON.stringify(layoutData.products.map((item) => item.id))}.`
		)
	}
	const layout = layoutData.layouts.find((item) => item.id === product.layoutId)
	if (!layout) throw new Error(`Product "${product.id}" references unknown layout "${product.layoutId}".`)

	return (
		<aside
			data-id="layout-options-panel"
			className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-surface p-3"
		>
			<h2 className="flex items-center gap-2 text-sm font-semibold">
				<Settings2 className="size-4" aria-hidden="true" />
				Product options
			</h2>

			<div className="mt-4 space-y-3">
				<div className="space-y-1">
					<Label>Product</Label>
					<ProductSelectorControls
						products={layoutData.products}
						activeProductId={product.id}
						onSelect={(productId) => controller.setActiveProduct(productId)}
						onCreate={(label) => controller.addProduct(layout.id, label)}
						onRename={(label) => controller.setProductLabel(product.id, label)}
						onDelete={() => controller.removeProduct(product.id)}
					/>
				</div>
				<Separator className="my-4" />
				<div className="space-y-1">
					<Label htmlFor="active-layout">Layout</Label>
					<Select
						value={layout.id}
						onValueChange={(layoutId) => controller.setProductLayout(product.id, layoutId)}
					>
						<SelectTrigger id="active-layout" data-id="active-layout-select">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{layoutData.layouts.map((item) => (
								<SelectItem key={item.id} value={item.id}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1">
					<Label htmlFor="layout-configuration-heading">Panel heading</Label>
					<Input
						key={`${layout.id}:${layout.configurationHeader}`}
						id="layout-configuration-heading"
						data-id="layout-configuration-heading"
						defaultValue={layout.configurationHeader}
						onKeyDown={(event) => {
							if (event.key === 'Enter') event.currentTarget.blur()
						}}
						onBlur={(event) => {
							const header = event.currentTarget.value.trim()
							if (!header) {
								event.currentTarget.value = layout.configurationHeader
								return
							}
							if (header !== layout.configurationHeader) {
								controller.setLayoutConfigurationHeader(layout.id, header)
							}
						}}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="layout-product-type">Slot</Label>
					<div className="flex gap-2">
						<Select
							value={layout.slotId}
							onValueChange={(slotId) => controller.setLayoutSlot(layout.id, slotId)}
						>
							<SelectTrigger id="layout-product-type" data-id="layout-product-type-select">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{layoutData.slots.map((slot) => (
									<SelectItem key={slot.id} value={slot.id}>
										{slot.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<SlotEditorDialog slotId={layout.slotId} compact />
					</div>
				</div>
			</div>

			<Separator className="my-4" />
			<section data-id="layout-item-limit">
				<h3 className="flex items-center gap-2 text-xs font-medium">
					<Boxes className="size-4" aria-hidden="true" />
					Item limit
				</h3>
				<div className="mt-2 grid grid-cols-2 gap-2">
					<LayoutNumberSetting
						id="layout-item-limit-min"
						label="Minimum"
						value={layout.slotsCount.min}
						min={0}
						max={layout.slotsCount.max}
						disabled={layout.type === 'single'}
						integer
						onChange={(min) =>
							controller.setLayoutSlotsCount(layout.id, {
								...layout.slotsCount,
								min,
							})
						}
					/>
					<LayoutNumberSetting
						id="layout-item-limit-max"
						label="Maximum"
						value={layout.slotsCount.max}
						min={Math.max(layout.slotsCount.min, product.instances.length)}
						disabled={layout.type === 'single'}
						integer
						onChange={(max) =>
							controller.setLayoutSlotsCount(layout.id, {
								...layout.slotsCount,
								max,
							})
						}
					/>
				</div>
			</section>
		</aside>
	)
}
