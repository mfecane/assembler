import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/parametric/components/NumericInput'
import { TransformOriginField } from '@/parametric/components/TransformOriginField'
import { Vec3Field } from '@/parametric/components/Vec3Field'
import { useNodeTransform, useVectorNumericFields } from '@/parametric/hooks/useGraphNode'

export function TransformSection({
	nodeId,
	defaultOpen = false,
}: {
	nodeId: string
	defaultOpen?: boolean
}) {
	const [open, setOpen] = useState(defaultOpen)
	const binding = useNodeTransform(nodeId)
	const translation = useVectorNumericFields(nodeId, 'translation', 'Position')
	const rotation = useVectorNumericFields(nodeId, 'rotation', 'Rotation')
	const scale = useVectorNumericFields(nodeId, 'scale', 'Scale')
	if (!binding) return null

	return (
		<div
			data-id={`node-transform-section-${nodeId}`}
			className="mt-2 border-t border-border pt-2"
		>
			<button
				type="button"
				className="nodrag nopan flex w-full items-center gap-1 text-xs font-medium text-muted-foreground"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
				Transform
			</button>
			{open && (
				<div className="mt-2 flex flex-col gap-2">
					<Vec3Field label="Position" fields={translation} />
					<Vec3Field label="Rotation" fields={rotation} step={1} />
					<div className="nodrag flex flex-col gap-1 text-xs">
						<div className="flex items-center justify-between gap-3">
							<span className="text-muted-foreground">Scale</span>
							<div className="flex items-center gap-1.5">
								<Label
									htmlFor={`${nodeId}-uniform-scale`}
									className="text-xs text-muted-foreground"
								>
									Uniform
								</Label>
								<Switch
									id={`${nodeId}-uniform-scale`}
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
					<div className="nodrag flex items-center gap-2">
						<Checkbox
							id={`${nodeId}-copy`}
							checked={binding.copy}
							onCheckedChange={(checked) => binding.setCopy(checked === true)}
						/>
						<Label htmlFor={`${nodeId}-copy`} className="text-xs text-muted-foreground">
							Clone geometry
						</Label>
					</div>
					<TransformOriginField value={binding.origin} onChange={binding.setOrigin} />
				</div>
			)}
		</div>
	)
}
