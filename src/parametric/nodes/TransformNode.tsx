import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import { Vec3Field } from '@/parametric/components/Vec3Field'
import { TransformOriginField } from '@/parametric/components/TransformOriginField'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useTransformNode, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'

export function TransformNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useTransformNode(id)
	const translation = useVectorNumericFields(id, 'translation', 'Position')
	const rotation = useVectorNumericFields(id, 'rotation', 'Rotation')
	const scale = useVectorNumericFields(id, 'scale', 'Scale')

	if (!binding) return null

	return (
		<div
			data-id={`transform-node-${id}`}
			className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle id="geometry" type="target" position={Position.Left} valueType="geometry" />
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2">
				<div className="nodrag relative flex items-center justify-between gap-3">
					<TypedHandle id="enabled" type="target" position={Position.Left} valueType="boolean" />
					<Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">Enabled</Label>
					<Switch
						data-id="transform-enabled-switch"
						id={`${id}-enabled`}
						checked={binding.enabled}
						disabled={binding.enabledConnected}
						onCheckedChange={binding.setEnabled}
						aria-label="Enable transform"
					/>
				</div>
				<div className="relative" data-id="transform-translation-input">
					<TypedHandle
						id="translation"
						type="target"
						position={Position.Left}
						valueType="vector3"
					/>
					<Vec3Field label="Position" fields={translation} />
					{binding.translationConnected && (
						<span className="text-[10px] text-muted-foreground">Driven by connection</span>
					)}
				</div>
				<Vec3Field label="Rotation" fields={rotation} step={1} />
				<div className="nodrag flex flex-col gap-1 text-xs">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Scale</span>
						<div className="flex items-center gap-1.5">
							<Label
								htmlFor={`${id}-uniform-scale`}
								className="text-xs text-muted-foreground"
							>
								Uniform
							</Label>
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
							field={{
								value: binding.scale.x,
								setValue: (value) => binding.setScale({ x: value, y: value, z: value }),
							}}
						/>
					) : (
						<div className="flex gap-1">
							{(['x', 'y', 'z'] as const).map((axis) => (
								<NumericInput key={axis} field={scale[axis]} />
							))}
						</div>
					)}
				</div>
				<div className="nodrag flex items-center justify-between gap-3">
					<Label htmlFor={`${id}-copy`} className="text-xs text-muted-foreground">
						Clone input
					</Label>
					<Switch
						data-id="clone-input-switch"
						id={`${id}-copy`}
						checked={binding.copy}
						onCheckedChange={binding.setCopy}
						aria-label="Clone input"
					/>
				</div>
				<TransformOriginField value={binding.origin} onChange={binding.setOrigin} />
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
