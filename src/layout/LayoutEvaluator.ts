import { Matrix4 } from 'three'
import type { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import type {
	SceneAssetInstanceMetadata,
	SceneMetadata,
} from '@/parametric/evaluation/SceneMetadata'
import { setSceneAssetInstanceTransform } from '@/parametric/evaluation/SceneBounds'
import type { GraphDocumentModel } from '@/parametric/model/GraphDocumentModel'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { productLayoutRegistry } from '@/layout/ProductLayoutRegistry'

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
		const productLayout = productLayoutRegistry.require(product.layoutId)
		const rootGraphIds = document.getRootGraphs().map((root) => root.getGraphId())
		const unsupported = product.instances.filter(
			(instance) => !productLayout.canInstantiateGraph(instance.graphId, rootGraphIds)
		)
		if (unsupported.length > 0) {
			throw new Error(
				`Product "${product.id}" layout "${product.layoutId}" cannot instantiate graph items `
				+ `${JSON.stringify(unsupported.map((instance) => ({ id: instance.id, graphId: instance.graphId })))}. `
				+ `Available root graphs: ${JSON.stringify(rootGraphIds)}.`
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
			addSlot: product.instances.length < productLayout.maximumInstances && rootGraphIds.length > 0
				? {
					id: `add-${product.id}-${product.instances.length}`,
					index: product.instances.length,
					position: productLayout.getNextSlotCenter(instanceMetadata),
				}
				: null,
		}
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
	return setSceneAssetInstanceTransform(
		{
			...asset,
			originNode: {
				...asset.originNode,
				nodeInstanceId: `${layoutId}/${instanceId}/${asset.originNode.nodeInstanceId}`,
			},
		},
		transform.elements.slice() as unknown as SceneAssetInstanceMetadata['transform'],
		`${layoutId}/${instanceId}/${asset.instanceId}`
	)
}
