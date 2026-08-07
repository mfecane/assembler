import { Position, type NodeProps } from '@xyflow/react'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useEnumNumberMapNode } from '@/parametric/hooks/useGraphNode'

export function EnumNumberMapNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useEnumNumberMapNode(id)
	if (!binding) return null

	const setNumberForValue = (enumValue: string, value: number) => {
		const existingMapping = binding.mappings.find(
			(mapping) => mapping.enumValue === enumValue
		)
		binding.setMappings(existingMapping
			? binding.mappings.map((mapping) =>
				mapping.enumValue === enumValue ? { ...mapping, value } : mapping
			)
			: [...binding.mappings, { enumValue, value }]
		)
	}

	return (
		<div
			data-id={`enum-number-map-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<TypedHandle id="enum" type="target" position={Position.Left} valueType="enum" />
			<NodeHeader nodeId={id} />
			<div className="flex flex-col gap-1.5">
				{binding.availableEnumValues.map((enumValue) => {
					const mapping = binding.mappings.find(
						(candidate) => candidate.enumValue === enumValue
					)
					return (
						<div
							key={enumValue}
							data-id={`enum-number-map-row-${enumValue}`}
							className="nodrag flex items-center justify-between gap-2 text-xs"
						>
							<span className="w-24 truncate text-foreground" title={enumValue}>
								{enumValue}
							</span>
							<NumericInput
								field={{
									value: mapping?.value ?? 0,
									setValue: (value) => setNumberForValue(enumValue, value),
								}}
								min={0}
								step={1}
							/>
						</div>
					)
				})}
				{binding.availableEnumValues.length === 0 && (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						Connect an enum output to configure mappings.
					</div>
				)}
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
