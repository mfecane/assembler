import { ChevronRight } from 'lucide-react'
import { TransformOriginField } from '@/parametric/components/TransformOriginField'
import { Vec3Field } from '@/parametric/components/Vec3Field'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { FieldBinding } from '@/parametric/hooks/useGraphNode'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { OriginAxis, TransformOrigin } from '@/parametric/model/GraphNode'

interface EmbeddedTransformSectionProps {
	nodeId: string
}

export function EmbeddedTransformSection({ nodeId }: EmbeddedTransformSectionProps) {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const field = <T,>(fieldId: string, fallback: T): FieldBinding<T> => {
		const value = model.getFieldValue(nodeId, fieldId)
		return {
			value: value === undefined ? fallback : value as T,
			setValue: (next: T) => controller.setFieldValue(nodeId, fieldId, next),
		}
	}
	const vectorFields = (fieldId: string) => ({
		x: field<number>(`${fieldId}.x`, 0),
		y: field<number>(`${fieldId}.y`, 0),
		z: field<number>(`${fieldId}.z`, 0),
	})
	const translation = vectorFields('transform.translation')
	const rotation = vectorFields('transform.rotation')
	const scale = vectorFields('transform.scale')
	const originX = field<OriginAxis>('transform.origin.x', 'middle')
	const originY = field<OriginAxis>('transform.origin.y', 'middle')
	const originZ = field<OriginAxis>('transform.origin.z', 'middle')
	const origin: TransformOrigin = { x: originX.value, y: originY.value, z: originZ.value }
	const setOrigin = (value: TransformOrigin) => {
		if (value.x !== origin.x) originX.setValue(value.x)
		else if (value.y !== origin.y) originY.setValue(value.y)
		else if (value.z !== origin.z) originZ.setValue(value.z)
	}

	return (
		<details data-id={`embedded-transform-${nodeId}`} className="group nodrag border-t border-border pt-1">
			<summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-xs text-muted-foreground">
				<ChevronRight className="size-3 transition-transform group-open:rotate-90" />
				Transform
			</summary>
			<div className="flex flex-col gap-2 pb-1 pt-1">
				<Vec3Field label="Position" fields={translation} />
				<Vec3Field label="Rotation" fields={rotation} step={1} />
				<Vec3Field label="Scale" fields={scale} />
				<TransformOriginField value={origin} onChange={setOrigin} />
			</div>
		</details>
	)
}
