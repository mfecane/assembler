import { Position, type NodeProps } from '@xyflow/react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import { EmbeddedTransformSection } from '@/parametric/components/EmbeddedTransformSection'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { NumberArrayEditor } from '@/parametric/components/NumberArrayEditor'
import { RgbColorInput } from '@/parametric/components/RgbColorInput'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'
import type {
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'

export function GraphInstanceNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const { document, model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof GraphInstanceGraphNode)) return null
	const graph = document.getGraph(node.getGraphId())
	if (!graph) return null
	const connectedInputIds = new Set(
		model.getEdges()
			.filter((edge) => edge.targetNodeId === id)
			.map((edge) => edge.targetPort)
	)

	return (
		<div
			data-id={`graph-instance-node-${id}`}
			className="min-w-60 rounded-md border border-primary/50 bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader
				nodeId={id}
				actions={(
					<div className="flex items-center">
						{graph.output.valueType === 'geometry' && (
							<GeometryPreviewButton nodeId={id} />
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="nodrag nopan h-6 w-6 text-muted-foreground"
							title={`Open ${graph.label}`}
							aria-label={`Open ${graph.label}`}
							onClick={() => controller.openGraph(graph.id)}
						>
							<ExternalLink />
						</Button>
					</div>
				)}
			/>
			<div className="flex flex-col gap-2">
				{graph.inputs.length === 0 ? (
					<div className="text-[11px] text-muted-foreground">No inputs</div>
				) : graph.inputs.map((input) => (
					<GraphInstanceInput
						key={input.id}
						nodeId={id}
						input={input}
						options={document.getInputOptions(input)}
						value={node.getInputValue(input.id) ?? input.defaultValue}
						connected={connectedInputIds.has(input.id)}
						onValueChange={(value) => controller.setGraphInstanceInputValue(
							id,
							input.id,
							value
						)}
					/>
				))}
			</div>
			<EmbeddedTransformSection nodeId={id} />
			<TypedHandle
				id={graph.output.id}
				type="source"
				position={Position.Right}
				valueType={graph.output.valueType}
			/>
		</div>
	)
}

function GraphInstanceInput({
	nodeId,
	input,
	options,
	value,
	connected,
	onValueChange,
}: {
	nodeId: string
	input: GraphInputDefinition
	options: string[]
	value: GraphInputValue | undefined
	connected: boolean
	onValueChange: (value: GraphInputValue) => void
}) {
	const controlId = `graph-instance-input-${nodeId}-${input.id}`

	return (
		<div
			data-id={controlId}
			className="relative grid min-h-8 grid-cols-[minmax(5rem,1fr)_9rem] items-center gap-2"
			title={connected ? `${input.label} is controlled by a connection` : undefined}
		>
			<TypedHandle
				id={input.id}
				type="target"
				position={Position.Left}
				valueType={input.valueType}
			/>
			<Label
				htmlFor={controlId}
				className="min-w-0 truncate text-[11px] text-muted-foreground"
			>
				{input.label}
			</Label>
			{input.valueType === 'number' ? (
				<DraftNumberInput
					id={controlId}
					data-id={`${controlId}-control`}
					className="nodrag h-8 px-2 text-xs"
					value={typeof value === 'number' ? value : 0}
					onValueChange={onValueChange}
					step={0.1}
					disabled={connected}
				/>
			) : input.valueType === 'numberArray' ? (
				<NumberArrayEditor
					dataId={`${controlId}-control`}
					values={Array.isArray(value) ? value : [0]}
					onChange={onValueChange}
					disabled={connected}
				/>
			) : input.valueType === 'enum' ? (
				<Select
					value={typeof value === 'string' ? value : options[0] ?? ''}
					onValueChange={onValueChange}
					disabled={connected}
				>
					<SelectTrigger
						id={controlId}
						data-id={`${controlId}-control`}
						className="nodrag h-8 px-2 text-xs"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option} value={option}>{option}</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : input.valueType === 'color' ? (
				<RgbColorInput
					id={controlId}
					value={typeof value === 'string' ? value : '#eaceac'}
					onValueChange={onValueChange}
					disabled={connected}
					ariaLabel={input.label}
				/>
			) : input.valueType === 'boolean' ? (
				<div className="flex h-8 items-center justify-end">
					<Switch
						id={controlId}
						data-id={`${controlId}-control`}
						className="nodrag"
						checked={value === true}
						onCheckedChange={onValueChange}
						disabled={connected}
						aria-label={input.label}
					/>
				</div>
			) : (
				<span className="text-right text-[11px] text-muted-foreground">connection only</span>
			)}
		</div>
	)
}
