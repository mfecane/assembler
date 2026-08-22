import type { NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useChoiceToVector3MapNode } from '@/parametric/hooks/useGraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function ChoiceToVector3MapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useChoiceToVector3MapNode(id)
	if (!binding) return null

	const setVectorAxis = (
		enumIndex: number,
		axis: keyof Vector3Snapshot,
		value: number
	) => {
		const existing = binding.mappings.find((mapping) => mapping.enumIndex === enumIndex)
		const vector = { ...(existing?.value ?? { x: 0, y: 0, z: 0 }), [axis]: value }
		binding.setMappings(existing
			? binding.mappings.map((mapping) =>
				mapping.enumIndex === enumIndex ? { ...mapping, value: vector } : mapping
			)
			: [...binding.mappings, { enumIndex, value: vector }]
		)
	}

	return (
		<NodeSurface nodeId={id} dataId={`choice-to-vector3-map-node-${id}`} className="min-w-72">
			<NodePortRow nodeId={id} portId="enum" valueType="enum" direction="input" label="Choice" />
			<NodePortGroup
				nodeId={id}
				portId="vector3"
				valueType="vector3"
				dataId={`choice-to-vector3-map-options-${id}`}
				className="flex flex-col gap-1.5"
			>
				{binding.availableEnumOptions.map((option, enumIndex) => {
					const value = binding.mappings.find(
						(mapping) => mapping.enumIndex === enumIndex
					)?.value ?? { x: 0, y: 0, z: 0 }
					return (
						<div
							key={enumIndex}
							data-id={`choice-to-vector3-map-row-${enumIndex}`}
							className="nodrag flex items-center gap-1 text-xs"
						>
							<span className="w-24 truncate text-foreground" title={option}>{option}</span>
							{(['x', 'y', 'z'] as const).map((axis) => (
								<NumericInput
									key={axis}
									value={value[axis]}
									onValueChange={(next) => setVectorAxis(enumIndex, axis, next)}
								/>
							))}
						</div>
					)
				})}
				{binding.availableEnumOptions.length === 0 && (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						Connect a choice output to configure mappings.
					</div>
				)}
			</NodePortGroup>
		</NodeSurface>
	)
}
