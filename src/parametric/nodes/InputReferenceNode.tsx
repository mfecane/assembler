import type { NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
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
		<NodeSurface nodeId={id} dataId={`input-reference-node-${id}`} className="min-w-52">
			<div data-id={`input-reference-node-fields-${id}`} className="flex flex-col gap-1.5">
				<Label htmlFor={`input-reference-${id}`} className="text-xs text-muted-foreground">
					Graph input
				</Label>
				<NodePortGroup nodeId={id} portId="value" valueType={input.valueType}
					dataId={`input-reference-value-${id}`}>
					<Select
						value={input.id}
						onValueChange={(inputId) => controller.setInputReferenceInput(id, inputId)}
					>
						<SelectTrigger id={`input-reference-${id}`} data-id={`input-reference-${id}`}
							className="nodrag h-8 text-xs">
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
				</NodePortGroup>
			</div>
		</NodeSurface>
	)
}
