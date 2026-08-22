import type { NodeProps } from '@xyflow/react'
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
import { NumericInput } from '@/parametric/components/NumericInput'
import { GraphInstanceTransformSection } from '@/parametric/components/GraphInstanceTransformSection'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { PrimitiveArrayEditor } from '@/parametric/components/PrimitiveArrayEditor'
import { MaterialSelect } from '@/parametric/components/MaterialSelect'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import type {
	GraphInputDefinition,
	GraphInputValue,
} from '@/parametric/model/GraphDocumentModel'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

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
		<NodeSurface
			nodeId={id}
			dataId={`graph-instance-node-${id}`}
			className="min-w-60"
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
		>
			<NodePortGroup nodeId={id} portId={graph.output.id} valueType={graph.output.valueType}
				dataId={`graph-instance-fields-${id}`} className="flex flex-col gap-2">
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
				<GraphInstanceTransformSection
					nodeId={id}
					translationConnected={connectedInputIds.has('translation')}
				/>
			</NodePortGroup>
		</NodeSurface>
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
		<NodePortRow
			nodeId={nodeId}
			portId={input.id}
			valueType={input.valueType}
			direction="input"
			className="min-h-8"
			label={<Label
				htmlFor={controlId}
				className="min-w-0 truncate text-[11px] text-muted-foreground"
			>
				{input.label}
			</Label>}
		>
			<div
				data-id={controlId}
				className="w-36"
				title={connected ? `${input.label} is controlled by a connection` : undefined}
			>
			{input.valueType === 'number' ? (
				<NumericInput
					id={controlId}
					data-id={`${controlId}-control`}
					className="nodrag h-8 px-2 text-xs"
					value={typeof value === 'number' ? value : 0}
					onValueChange={onValueChange}
					step={0.1}
					disabled={connected}
				/>
			) : input.valueType === 'primitiveArray' ? (
				<PrimitiveArrayEditor
					dataId={`${controlId}-control`}
					elementType={getPrimitiveArrayElementType(value)}
					options={options}
					values={Array.isArray(value) ? value.filter((item): item is number | boolean => (
						typeof item === 'number' || typeof item === 'boolean'
					)) : []}
					onChange={onValueChange}
					disabled={connected}
				/>
				) : input.valueType === 'vector3' ? (
					<Vector3Input
						value={value as Vector3Snapshot}
						onChange={onValueChange}
						disabled={connected}
					/>
				) : input.valueType === 'enum' ? (
					<Select
						value={String(typeof value === 'number' ? value : 0)}
						onValueChange={(next) => onValueChange(Number(next))}
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
							{options.map((option, index) => (
								<SelectItem key={index} value={String(index)}>{option}</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : input.valueType === 'materialInstance' ? (
				<MaterialSelect
					id={controlId}
					dataId={`${controlId}-control`}
					value={typeof value === 'string' ? value : 'wood'}
					onValueChange={onValueChange}
					disabled={connected}
					ariaLabel={input.label}
				/>
			) : input.valueType === 'color' ? (
				<Select
					value={typeof value === 'string' ? value : '#ffffff'}
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
						{COLOR_PALETTE.map((option) => (
							<SelectItem key={option.hex} value={option.hex}>
								<span className="flex items-center gap-2">
									<span
										aria-hidden="true"
										className="h-3.5 w-3.5 rounded-sm border border-border"
										style={{ backgroundColor: option.hex }}
									/>
									{option.name}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
		</NodePortRow>
	)
}

function getPrimitiveArrayElementType(
	value: GraphInputValue | undefined
): 'number' | 'boolean' | 'enum' {
	const firstValue = Array.isArray(value) ? value[0] : undefined
	return typeof firstValue === 'boolean' ? 'boolean' : 'number'
}

function Vector3Input({
	value,
	onChange,
	disabled,
}: {
	value: Vector3Snapshot
	onChange: (value: Vector3Snapshot) => void
	disabled: boolean
}) {
	return (
		<div data-id="graph-instance-vector3-fields" className="flex flex-col gap-1">
			{(['x', 'y', 'z'] as const).map((axis) => (
				<div key={axis} className="flex items-center gap-2">
					<AxisLabel axis={axis} />
					<NumericInput
						data-id={`graph-instance-vector3-${axis}`}
						className="nodrag h-8 min-w-0 flex-1 px-2 text-xs"
						value={value[axis]}
						onValueChange={(next) => onChange({ ...value, [axis]: next })}
						step={0.1}
						disabled={disabled}
					/>
				</div>
			))}
		</div>
	)
}
