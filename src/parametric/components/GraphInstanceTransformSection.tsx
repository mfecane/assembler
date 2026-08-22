import { NodeCapability } from '@/parametric/components/NodeCapability'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { TransformOriginField } from '@/parametric/components/TransformOriginField'
import { Vec3Field, Vec3Inputs } from '@/parametric/components/Vec3Field'
import { useEmbeddedTransformFields } from '@/parametric/components/EmbeddedTransformSection'

interface GraphInstanceTransformSectionProps {
	nodeId: string
	translationConnected: boolean
}

export function GraphInstanceTransformSection({
	nodeId,
	translationConnected,
}: GraphInstanceTransformSectionProps) {
	const transform = useEmbeddedTransformFields(nodeId)
	const translationActive = translationConnected || Object.values(transform.translation).some(
		(field) => field.value !== 0
	)

	return (
		<div data-id={`graph-instance-transform-${nodeId}`} className="flex flex-col gap-2">
			<NodeCapability nodeId={nodeId} label="Translate" activeWhen={translationActive}>
				<NodePortRow
					nodeId={nodeId}
					portId="translation"
					valueType="vector3"
					direction="input"
					label="Translate"
				>
					<Vec3Inputs fields={transform.translation} disabled={translationConnected} />
				</NodePortRow>
			</NodeCapability>
			<NodeCapability nodeId={nodeId} label="Rotate">
				<Vec3Field label="Rotation" fields={transform.rotation} step={1} />
			</NodeCapability>
			<NodeCapability nodeId={nodeId} label="Scale">
				<Vec3Field label="Scale" fields={transform.scale} />
			</NodeCapability>
			<NodeCapability nodeId={nodeId} label="Origin">
				<TransformOriginField value={transform.origin} onChange={transform.setOrigin} />
			</NodeCapability>
		</div>
	)
}
