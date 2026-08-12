import { Position, type NodeProps } from '@xyflow/react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGeometrySwitchNode } from '@/parametric/hooks/useGraphNode'

export function GeometrySwitchNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useGeometrySwitchNode(id)
	if (!binding) return null

	const updateCase = (index: number, enumValue: string) => {
		binding.setCases(binding.cases.map((switchCase, caseIndex) => (
			caseIndex === index ? { ...switchCase, enumValue } : switchCase
		)))
	}

	const addCase = () => {
		const inputIds = new Set(binding.cases.map((switchCase) => switchCase.id))
		const enumValues = new Set(binding.cases.map((switchCase) => switchCase.enumValue))
		let sequence = binding.cases.length + 1
		while (inputIds.has(`geometry-${sequence}`) || enumValues.has(`Option ${sequence}`)) sequence += 1
		binding.setCases([
			...binding.cases,
			{ id: `geometry-${sequence}`, enumValue: `Option ${sequence}` },
		])
	}

	return (
		<div
			data-id={`geometry-switch-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} actions={<GeometryNodeActions nodeId={id} />} />
			<div className="flex flex-col gap-2 text-xs">
				<div
					data-id={`geometry-switch-choice-${id}`}
					className="relative flex h-7 items-center rounded border border-border bg-input px-2"
				>
					<TypedHandle id="choice" type="target" position={Position.Left} valueType="enum" />
					<span className="text-muted-foreground">Choice</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Geometry cases</span>
					<Button
						data-id={`geometry-switch-add-case-${id}`}
						type="button"
						variant="ghost"
						size="icon"
						className="nodrag h-6 w-6 text-muted-foreground"
						onClick={addCase}
						aria-label="Add geometry switch case"
						title="Add case"
					>
						<Plus />
					</Button>
				</div>
				{binding.cases.map((switchCase, index) => (
					<div
						key={switchCase.id}
						data-id={`geometry-switch-case-${id}-${switchCase.id}`}
						className="relative flex items-center gap-1"
					>
						<TypedHandle
							id={switchCase.id}
							type="target"
							position={Position.Left}
							valueType="geometry"
						/>
						<Input
							className="nodrag h-7 px-2 text-xs"
							defaultValue={switchCase.enumValue}
							onBlur={(event) => updateCase(index, event.currentTarget.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') event.currentTarget.blur()
							}}
							aria-label={`Geometry switch choice ${index + 1}`}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="nodrag h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
							onClick={() => binding.setCases(
								binding.cases.filter((_, caseIndex) => caseIndex !== index)
							)}
							disabled={binding.cases.length === 1}
							aria-label={`Remove geometry switch choice ${index + 1}`}
							title={binding.cases.length === 1 ? 'Switch requires one case' : 'Remove case'}
						>
							<Trash2 />
						</Button>
					</div>
				))}
			</div>
			<TypedHandle id="geometry" type="source" position={Position.Right} valueType="geometry" />
		</div>
	)
}
