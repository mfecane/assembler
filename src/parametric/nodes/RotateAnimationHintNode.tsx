import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeCapability } from '@/parametric/components/NodeCapability'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { NumericInput } from '@/parametric/components/NumericInput'
import { TransformOriginInputs } from '@/parametric/components/TransformOriginField'
import { Vec3Inputs } from '@/parametric/components/Vec3Field'
import {
	useConnectedInputPorts,
	useField,
	useNumericField,
	useVectorNumericFields,
} from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import type { Axis, TransformOrigin } from '@/parametric/model/GraphNode'

export function RotateAnimationHintNode({ id }: NodeProps<ParametricFlowNode>) {
	const angle = useNumericField(id, 'angle')
	const offset = useVectorNumericFields(id, 'offset', 'Offset')
	const connectedInputs = useConnectedInputPorts(id)
	const axis = useField<Axis>(id, 'axis', 'y')
	const axisPositionX = useField<TransformOrigin['x']>(id, 'axisPosition.x', 'min')
	const axisPositionY = useField<TransformOrigin['y']>(id, 'axisPosition.y', 'middle')
	const axisPositionZ = useField<TransformOrigin['z']>(id, 'axisPosition.z', 'middle')
	const axisPosition: TransformOrigin = {
		x: axisPositionX.value,
		y: axisPositionY.value,
		z: axisPositionZ.value,
	}
	const offsetActive = connectedInputs.has('offset') || Object.values(offset).some(
		(field) => field.value !== 0
	)

	return (
		<NodeSurface nodeId={id} dataId={`rotate-animation-hint-node-${id}`}
			actions={<GeometryNodeActions nodeId={id} />} className="min-w-48">
			<div className="flex flex-col gap-2 text-xs">
				<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="both" label="Geometry" />
				<div className="nodrag flex items-center justify-between gap-2">
					<Label htmlFor={`${id}-axis`} className="text-xs text-muted-foreground">Axis</Label>
					<Select value={axis.value} onValueChange={(value) => axis.setValue(value as Axis)}>
						<SelectTrigger id={`${id}-axis`} data-id={`rotate-animation-axis-${id}`} className="h-7 w-20 px-2 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(['x', 'y', 'z'] as const).map((value) => (
								<SelectItem key={value} value={value}><AxisLabel axis={value} /></SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<AngleInput id={id} label="Angle" field={angle} />
				<div className="flex flex-col gap-1">
					<span className="text-muted-foreground">Pivot</span>
					<TransformOriginInputs value={axisPosition} onChange={(value) => {
						axisPositionX.setValue(value.x)
						axisPositionY.setValue(value.y)
						axisPositionZ.setValue(value.z)
					}} />
				</div>
				<NodeCapability nodeId={id} label="Offset" activeWhen={offsetActive}>
					<NodePortRow
						nodeId={id}
						portId="offset"
						valueType="vector3"
						direction="input"
						label="Offset"
					>
						<Vec3Inputs fields={offset} step={0.01} disabled={connectedInputs.has('offset')} />
					</NodePortRow>
				</NodeCapability>
			</div>
		</NodeSurface>
	)
}

function AngleInput({ id, label, field }: {
	id: string
	label: string
	field: ReturnType<typeof useNumericField>
}) {
	return (
		<div className="nodrag flex items-center justify-between gap-2">
			<Label htmlFor={`${id}-${label}`} className="text-xs text-muted-foreground">{label}</Label>
			<NumericInput id={`${id}-${label}`} value={field.value} onValueChange={field.setValue} step={1} />
		</div>
	)
}
