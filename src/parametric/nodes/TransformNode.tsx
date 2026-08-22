import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import { Vec3Inputs } from '@/parametric/components/Vec3Field'
import { TransformOriginInputs } from '@/parametric/components/TransformOriginField'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeCapability } from '@/parametric/components/NodeCapability'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { useTransformNode, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function TransformNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useTransformNode(id)
	const translation = useVectorNumericFields(id, 'translation', 'Position')
	const rotation = useVectorNumericFields(id, 'rotation', 'Rotation')
	const scale = useVectorNumericFields(id, 'scale', 'Scale')

	if (!binding) return null

	return (
		<NodeSurface nodeId={id} dataId={`transform-node-${id}`} actions={<GeometryNodeActions nodeId={id} />}>
			<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="both" label="Geometry" />
			<div className="flex flex-col gap-2">
				<NodePortRow nodeId={id} portId="enabled" valueType="boolean" direction="input" label={(
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">Enabled</Label>
				)}>
					<Switch
						data-id="transform-enabled-switch"
						id={`${id}-enabled`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable transform"
					/>
				</NodePortRow>
				<NodePortRow
					nodeId={id}
					portId="translation"
					valueType="vector3"
					direction="input"
					label="Position"
				>
					<Vec3Inputs fields={translation} step={0.01} disabled={binding.translationConnected} />
				</NodePortRow>
				<NodeCapability nodeId={id} label="Rotation">
					<Vec3Inputs fields={rotation} step={1} />
				</NodeCapability>
				<NodeCapability nodeId={id} label="Scale">
					<div className="nodrag flex flex-col gap-1 text-xs">
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground">Uniform</span>
							<div className="flex items-center gap-1.5">
								<Switch
									id={`${id}-uniform-scale`}
									checked={binding.uniformScale}
									onCheckedChange={binding.setUniformScale}
									aria-label="Use uniform scale"
								/>
							</div>
						</div>
						{binding.uniformScale ? (
							<NumericInput
								value={binding.scale.x}
								onValueChange={(value) => binding.setScale({ x: value, y: value, z: value })}
							/>
						) : (
							<div className="flex gap-1">
								{(['x', 'y', 'z'] as const).map((axis) => (
									<NumericInput
										key={axis}
										value={scale[axis].value}
										onValueChange={scale[axis].setValue}
									/>
								))}
							</div>
						)}
					</div>
				</NodeCapability>
				<NodeCapability nodeId={id} label="Clone Input">
					<div className="nodrag flex items-center justify-between gap-3">
						<Label htmlFor={`${id}-copy`} className="text-xs text-muted-foreground">
							Enabled
						</Label>
						<Switch
							data-id="clone-input-switch"
							id={`${id}-copy`}
							checked={binding.copy}
							onCheckedChange={binding.setCopy}
							aria-label="Clone input"
						/>
					</div>
				</NodeCapability>
				<NodeCapability nodeId={id} label="Origin">
					<TransformOriginInputs value={binding.origin} onChange={binding.setOrigin} />
				</NodeCapability>
			</div>
		</NodeSurface>
	)
}
