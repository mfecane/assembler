import { Position, type NodeProps } from '@xyflow/react'
import { Switch } from '@/components/ui/switch'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
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
		<div
			data-id={`choice-to-boolean-map-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle id="enum" type="target" position={Position.Left} valueType="enum" />
			<NodeHeader nodeId={id} />
			<div className="flex flex-col gap-1.5">
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
			</div>
			<TypedHandle id="boolean" type="source" position={Position.Right} valueType="boolean" />
		</div>
	)
}
