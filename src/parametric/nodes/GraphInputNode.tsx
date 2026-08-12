import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { EnumDefinitionFields } from '@/parametric/components/EnumDefinitionFields'
import { RgbColorInput } from '@/parametric/components/RgbColorInput'
import { Switch } from '@/components/ui/switch'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { NumberArrayEditor } from '@/parametric/components/NumberArrayEditor'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { GraphInputGraphNode } from '@/parametric/model/GraphNode'
import { defaultMaterialColor } from '@/parametric/model/ColorPalette'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function GraphInputNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const { document, activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof GraphInputGraphNode)) return null
	const graph = document.requireGraph(activeGraphId)
	const input = graph.inputs.find((candidate) => candidate.id === node.getInputId())
	if (!input) return null

	return (
		<div
			data-id={`graph-input-node-${input.id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader
				nodeId={id}
				actions={input.valueType === 'geometry' ? <GeometryPreviewButton nodeId={id} /> : undefined}
			/>
			<div className="mb-2 text-[11px] capitalize text-muted-foreground">
				{input.valueType === 'enum'
					? 'choice'
					: input.valueType === 'numberArray'
						? 'number array'
						: input.valueType} input
			</div>
			<div className="flex flex-col gap-2">
				{input.valueType === 'number' && (
					<DraftNumberInput
						data-id={`graph-input-default-${input.id}`}
						className="nodrag h-8 px-2 text-xs"
						value={typeof input.defaultValue === 'number' ? input.defaultValue : 0}
						onValueChange={(value) => controller.updateGraphInput(input.id, {
							defaultValue: value,
						})}
						step={0.1}
					/>
				)}
				{input.valueType === 'numberArray' && (
					<NumberArrayEditor
						dataId={`graph-input-default-${input.id}`}
						values={Array.isArray(input.defaultValue) ? input.defaultValue : [0]}
						onChange={(defaultValue) => controller.updateGraphInput(input.id, {
							defaultValue,
						})}
					/>
				)}
				{input.valueType === 'color' && (
					<RgbColorInput
						id={`graph-input-default-${input.id}`}
						dataId={`graph-input-default-${input.id}`}
						value={typeof input.defaultValue === 'string'
							? input.defaultValue
							: defaultMaterialColor}
						onValueChange={(defaultValue) => controller.updateGraphInput(input.id, {
							defaultValue,
						})}
						ariaLabel={`Default color for ${input.label || input.id}`}
					/>
				)}
				{input.valueType === 'boolean' && (
					<div className="flex h-8 items-center justify-between gap-3">
						<Label
							htmlFor={`graph-input-default-${input.id}`}
							className="text-xs text-muted-foreground"
						>
							Default value
						</Label>
						<Switch
							id={`graph-input-default-${input.id}`}
							data-id={`graph-input-default-${input.id}`}
							className="nodrag"
							checked={input.defaultValue === true}
							onCheckedChange={(defaultValue) => controller.updateGraphInput(input.id, {
								defaultValue,
							})}
							aria-label={`Default value for ${input.label || input.id}`}
						/>
					</div>
				)}
				{input.valueType === 'enum' && (
					<EnumDefinitionFields inputId={input.id} />
				)}
			</div>
			<TypedHandle
				id={input.id}
				type="source"
				position={Position.Right}
				valueType={input.valueType}
			/>
		</div>
	)
}
