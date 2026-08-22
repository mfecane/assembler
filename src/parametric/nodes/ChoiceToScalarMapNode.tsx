import type { NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useChoiceToScalarMapNode } from '@/parametric/hooks/useGraphNode'

export function ChoiceToScalarMapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useChoiceToScalarMapNode(id)
	if (!binding) return null

	const setNumberForIndex = (enumIndex: number, value: number) => {
		const existingMapping = binding.mappings.find(
			(mapping) => mapping.enumIndex === enumIndex
		)
		binding.setMappings(existingMapping
			? binding.mappings.map((mapping) =>
				mapping.enumIndex === enumIndex ? { ...mapping, value } : mapping
			)
			: [...binding.mappings, { enumIndex, value }]
		)
	}

	return (
		<NodeSurface nodeId={id} dataId={`choice-to-scalar-map-node-${id}`} className="min-w-56">
			<NodePortRow nodeId={id} portId="enum" valueType="enum" direction="input" label="Choice" />
			<NodePortGroup
				nodeId={id}
				portId="number"
				valueType="number"
				dataId={`choice-to-scalar-map-options-${id}`}
				className="flex flex-col gap-1.5"
			>
				{binding.availableEnumOptions.map((option, enumIndex) => {
					const mapping = binding.mappings.find(
						(candidate) => candidate.enumIndex === enumIndex
					)
					return (
						<div
							key={enumIndex}
							data-id={`choice-to-scalar-map-row-${enumIndex}`}
							className="nodrag flex items-center justify-between gap-2 text-xs"
						>
							<span className="w-24 truncate text-foreground" title={option}>
								{option}
							</span>
							<NumericInput
								value={mapping?.value ?? 0}
								onValueChange={(value) => setNumberForIndex(enumIndex, value)}
								step={0.1}
							/>
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
