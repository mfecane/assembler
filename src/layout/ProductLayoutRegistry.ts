import type { ProductLayout } from '@/layout/ProductLayout'
import { RowLayout } from '@/layout/RowLayout'
import { SingleItemLayout } from '@/layout/SingleItemLayout'

export class ProductLayoutRegistry {
	private readonly layouts = new Map<string, ProductLayout>()

	public constructor(layouts: ProductLayout[]) {
		for (const layout of layouts) {
			if (this.layouts.has(layout.id)) throw new Error(`Duplicate product layout ID "${layout.id}".`)
			this.layouts.set(layout.id, layout)
		}
	}

	public getAll(): ProductLayout[] {
		return [...this.layouts.values()]
	}

	public require(layoutId: string): ProductLayout {
		const layout = this.layouts.get(layoutId)
		if (!layout) {
			throw new Error(
				`Unknown product layout implementation "${layoutId}". Registered layouts: `
				+ `${JSON.stringify([...this.layouts.keys()])}.`
			)
		}
		return layout
	}
}

export const productLayoutRegistry = new ProductLayoutRegistry([
	new RowLayout(),
	new SingleItemLayout(),
])
