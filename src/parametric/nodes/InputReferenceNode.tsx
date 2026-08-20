import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { InputReferenceGraphNode } from '@/parametric/model/GraphNode'

export function InputReferenceNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const { activeGraphId, document, model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof InputReferenceGraphNode)) return null
	const inputs = document.requireGraph(activeGraphId).inputs
	const input = inputs.find((candidate) => candidate.id === node.getInputId())
	if (!input) {
		throw new Error(
			`Input Reference node "${id}" in graph "${activeGraphId}" references missing graph input `
			+ `"${node.getInputId()}". Available input IDs: ${JSON.stringify(inputs.map(
				(candidate) => candidate.id
			))}.`
		)
	}

	return (
		<div
			data-id={`input-reference-node-${id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div data-id={`input-reference-node-fields-${id}`} className="flex flex-col gap-1.5">
				<Label htmlFor={`input-reference-${id}`} className="text-xs text-muted-foreground">
					Graph input
				</Label>
				<Select
					value={input.id}
					onValueChange={(inputId) => controller.setInputReferenceInput(id, inputId)}
				>
					<SelectTrigger
						id={`input-reference-${id}`}
						data-id={`input-reference-${id}`}
						className="nodrag h-8 text-xs"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{inputs.map((candidate) => (
							<SelectItem key={candidate.id} value={candidate.id}>
								{candidate.label} ({candidate.valueType})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<TypedHandle id="value" type="source" position={Position.Right} valueType={input.valueType} />
		</div>
	)
}
