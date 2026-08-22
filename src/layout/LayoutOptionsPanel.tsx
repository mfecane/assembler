import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ProductSelectorControls } from '@/layout/ProductSelectorControls'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { ProductConfigurationDialog } from '@/layout/ProductConfigurationDialog'
import { Settings2 } from 'lucide-react'

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
				<ProductConfigurationDialog product={product} />
			</div>
		</aside>
	)
}
