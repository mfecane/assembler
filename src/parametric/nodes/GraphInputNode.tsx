import { Position, type NodeProps } from '@xyflow/react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { NodeDeleteButton } from '@/parametric/components/NodeDeleteButton'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { PresetColorSelect } from '@/parametric/components/PresetColorSelect'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'
import { GraphInputGraphNode } from '@/parametric/model/GraphNode'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function GraphInputNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useGraphController()
	const { document, activeGraphId, model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof GraphInputGraphNode)) return null
	const graph = document.requireGraph(activeGraphId)
	const input = graph.inputs.find((candidate) => candidate.id === node.getInputId())
	if (!input) return null

	const updateOptions = (options: string[]) => {
		const normalized = [...new Set(options.map((option) => option.trim()).filter(Boolean))]
		if (normalized.length === 0) return
		controller.updateGraphInput(input.id, {
			options: normalized,
			defaultValue: normalized.includes(String(input.defaultValue))
				? input.defaultValue
				: normalized[0],
		})
	}

	return (
		<div
			data-id={`graph-input-node-${input.id}`}
			className="min-w-52 rounded-md border border-primary/40 bg-surface px-3 py-2 shadow-md"
		>
			<div className="mb-2 flex items-center justify-between gap-2 pr-3">
				<div>
					<div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
						Assembly input
					</div>
					<div className="text-[11px] text-muted-foreground">{input.valueType}</div>
				</div>
				<div className="flex items-center gap-0.5">
					{input.valueType === 'geometry' && (
						<GeometryPreviewButton nodeId={id} />
					)}
					<NodeDeleteButton nodeId={id} nodeLabel={input.label || input.valueType} />
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<Input
					data-id={`graph-input-label-${input.id}`}
					className="nodrag h-8 px-2 text-xs"
					value={input.label}
					onChange={(event) => controller.updateGraphInput(input.id, {
						label: event.target.value,
					})}
					aria-label={`${input.valueType} input label`}
					placeholder="Label"
				/>
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
				{input.valueType === 'color' && (
					<PresetColorSelect
						id={`graph-input-default-${input.id}`}
						value={typeof input.defaultValue === 'string' ? input.defaultValue : '#eaceac'}
						onValueChange={(value) => controller.updateGraphInput(input.id, {
							defaultValue: value,
						})}
					/>
				)}
				{input.valueType === 'enum' && (
					<>
						<div className="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>Options</span>
							<Button
								data-id={`add-option-${input.id}`}
								type="button"
								variant="ghost"
								size="icon"
								className="nodrag h-6 w-6"
								onClick={() => {
									const options = input.options ?? []
									let sequence = options.length + 1
									let option = `Option ${sequence}`
									while (options.includes(option)) {
										sequence += 1
										option = `Option ${sequence}`
									}
									updateOptions([...options, option])
								}}
								aria-label="Add enum option"
							>
								<Plus />
							</Button>
						</div>
						{(input.options ?? []).map((option, index) => (
							<div key={`${index}:${option}`} className="flex items-center gap-1">
								<Input
									data-id={`graph-input-option-${input.id}-${index}`}
									className="nodrag h-7 px-2 text-xs"
									defaultValue={option}
									onBlur={(event) => updateOptions(
										(input.options ?? []).map((candidate, candidateIndex) =>
											candidateIndex === index ? event.currentTarget.value : candidate
										)
									)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') event.currentTarget.blur()
									}}
									aria-label={`Enum option ${index + 1}`}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="nodrag h-7 w-7 text-muted-foreground hover:text-destructive"
									disabled={(input.options?.length ?? 0) <= 1}
									onClick={() => updateOptions(
										(input.options ?? []).filter((_, candidateIndex) =>
											candidateIndex !== index
										)
									)}
									aria-label={`Remove enum option ${index + 1}`}
								>
									<Trash2 />
								</Button>
							</div>
						))}
						<Select
							value={String(input.defaultValue ?? '')}
							onValueChange={(value) => controller.updateGraphInput(input.id, {
								defaultValue: value,
							})}
						>
							<SelectTrigger
								data-id={`graph-input-default-${input.id}`}
								className="nodrag h-8 px-2 text-xs"
								aria-label="Default enum option"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(input.options ?? []).map((option) => (
									<SelectItem key={option} value={option}>{option}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</>
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
