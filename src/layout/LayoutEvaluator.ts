import { Matrix4 } from 'three'
import type { LayoutDocument } from '@/layout/LayoutDocument'
import type { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import type {
	Matrix4Snapshot,
	SceneAssetInstanceMetadata,
	SceneMetadata,
} from '@/parametric/evaluation/SceneMetadata'
import type { GraphDocumentModel } from '@/parametric/model/GraphDocumentModel'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import type { ProductLayout } from '@/layout/ProductLayout'
import { RowLayout } from '@/layout/RowLayout'
import { SingleItemLayout } from '@/layout/SingleItemLayout'

export interface LayoutWorldSlot {
	id: string
	index: number
	position: Vector3Snapshot
}

export interface EvaluatedLayout {
	productId: string
	metadata: SceneMetadata
	addSlot: LayoutWorldSlot | null
}

export class LayoutEvaluator {
	public constructor(private readonly graphEvaluator: GraphEvaluator) {}

	public evaluate(document: GraphDocumentModel): EvaluatedLayout {
		const layoutData = document.getLayout()
		const product = layoutData.products.find((item) => item.id === layoutData.activeProductId)
		if (!product) {
			throw new Error(
				`Cannot evaluate active product "${layoutData.activeProductId}": it is missing from `
				+ `${JSON.stringify(layoutData.products.map((item) => item.id))}.`
			)
		}
		const layout = layoutData.layouts.find((item) => item.id === product.layoutId)
		if (!layout) throw new Error(`Product "${product.id}" references unknown layout "${product.layoutId}".`)
		const slot = layoutData.slots.find((item) => item.id === layout.slotId)
		if (!slot) {
			throw new Error(
				`Cannot evaluate layout "${layout.id}": slot definition "${layout.slotId}" is missing. `
				+ `Available slot definitions: ${JSON.stringify(layoutData.slots.map((item) => item.id))}.`
			)
		}

		const instanceMetadata = product.instances.map((instance) =>
			this.graphEvaluator.evaluateGraphInstance(
				document,
				instance.graphId,
				instance.inputValues,
				instance.id
			)
		)
		const productLayout = createProductLayout(layout)
		const positions = productLayout.getSlotPositions(instanceMetadata)

		return {
			productId: product.id,
			metadata: {
				assetInstances: product.instances.flatMap((instance, index) => {
					return instanceMetadata[index].assetInstances.map((asset) =>
						placeAsset(asset, product.id, instance.id, positions[index])
					)
				}),
			},
			addSlot: product.instances.length < layout.slotsCount.max && slot.graphs.length > 0
				? {
					id: `add-${product.id}-${product.instances.length}`,
					index: product.instances.length,
					position: productLayout.getNextSlotCenter(instanceMetadata),
				}
				: null,
		}
	}
}

function createProductLayout(layout: LayoutDocument): ProductLayout {
	switch (layout.type) {
		case 'row':
			return new RowLayout()
		case 'single':
			return new SingleItemLayout()
	}
}

function placeAsset(
	asset: SceneAssetInstanceMetadata,
	layoutId: string,
	instanceId: string,
	position: Vector3Snapshot
): SceneAssetInstanceMetadata {
	const transform = new Matrix4()
		.makeTranslation(position.x, position.y, position.z)
		.multiply(new Matrix4().fromArray(asset.transform))
	return {
		...asset,
		instanceId: `${layoutId}/${instanceId}/${asset.instanceId}`,
		transform: transform.elements.slice() as unknown as Matrix4Snapshot,
		originNode: {
			...asset.originNode,
			nodeInstanceId: `${layoutId}/${instanceId}/${asset.originNode.nodeInstanceId}`,
		},
	}
}
