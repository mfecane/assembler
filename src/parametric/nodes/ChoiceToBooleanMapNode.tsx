import type { NodeProps } from '@xyflow/react'
import { Switch } from '@/components/ui/switch'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useChoiceToBooleanMapNode } from '@/parametric/hooks/useGraphNode'

export function ChoiceToBooleanMapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useChoiceToBooleanMapNode(id)
	if (!binding) return null

	const setBooleanForIndex = (enumIndex: number, value: boolean) => {
		const existingMapping = binding.mappings.find((mapping) => mapping.enumIndex === enumIndex)
		binding.setMappings(existingMapping
			? binding.mappings.map((mapping) =>
				mapping.enumIndex === enumIndex ? { ...mapping, value } : mapping
			)
			: [...binding.mappings, { enumIndex, value }]
		)
	}

	return (
		<NodeSurface nodeId={id} dataId={`choice-to-boolean-map-node-${id}`} className="min-w-56">
			<NodePortRow nodeId={id} portId="enum" valueType="enum" direction="input" label="Choice" />
			<NodePortGroup
				nodeId={id}
				portId="boolean"
				valueType="boolean"
				dataId={`choice-to-boolean-map-options-${id}`}
				className="flex flex-col gap-1.5"
			>
				{binding.availableEnumOptions.map((option, enumIndex) => {
					const value = binding.mappings.find(
						(mapping) => mapping.enumIndex === enumIndex
					)?.value ?? false
					return (
						<div
							key={enumIndex}
							data-id={`choice-to-boolean-map-row-${enumIndex}`}
							className="nodrag flex items-center justify-between gap-2 text-xs"
						>
							<span className="w-24 truncate text-foreground" title={option}>{option}</span>
							<Switch
								data-id={`choice-to-boolean-map-switch-${enumIndex}`}
								checked={value}
								onCheckedChange={(next) => setBooleanForIndex(enumIndex, next)}
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
