import { Position, type NodeProps } from '@xyflow/react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EnumDefinitionFields } from '@/parametric/components/EnumDefinitionFields'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { MaterialSelect } from '@/parametric/components/MaterialSelect'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { NumberArrayEditor } from '@/parametric/components/NumberArrayEditor'
import { NumericInput } from '@/parametric/components/NumericInput'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import { InputGraphNode } from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function InputNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof InputGraphNode)) return null
	const valueType = node.getValueType()
	const value = node.getValue()

	return (
		<div
			data-id={`input-node-${id}`}
			className="min-w-52 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			{valueType === 'materialInstance' && (
				<TypedHandle
					id="color"
					type="target"
					position={Position.Left}
					valueType="color"
					style={{ top: '55%' }}
				/>
			)}
			<NodeHeader
				nodeId={id}
				actions={valueType === 'geometry' ? <GeometryPreviewButton nodeId={id} /> : undefined}
			/>
			<div data-id={`input-node-fields-${id}`} className="flex flex-col gap-2">
				{valueType === 'number' && (
					<NumericInput
						data-id={`input-value-${id}`}
						className="nodrag h-8 max-w-full text-xs"
						value={typeof value === 'number' ? value : 0}
						onValueChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
						step={0.1}
					/>
				)}
				{valueType === 'numberArray' && (
					<NumberArrayEditor
						dataId={`input-value-${id}`}
						values={Array.isArray(value) ? value : [0]}
						onChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
					/>
				)}
				{valueType === 'vector3' && (
					<Vector3Input
						value={value as Vector3Snapshot}
						onChange={(next) => controller.updateGraphInput(id, { defaultValue: next })}
					/>
				)}
				{valueType === 'materialInstance' && (
					<MaterialSelect
						id={`input-value-${id}`}
						dataId={`input-value-${id}`}
						value={typeof value === 'string' ? value : 'wood'}
						onValueChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
						ariaLabel={`Material for ${node.getName() || id}`}
					/>
				)}
				{valueType === 'color' && (
					<Select
						value={typeof value === 'string' ? value : '#ffffff'}
						onValueChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
					>
						<SelectTrigger data-id={`input-value-${id}`} className="nodrag h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{COLOR_PALETTE.map((option) => (
								<SelectItem key={option.hex} value={option.hex}>
									<span className="flex items-center gap-2">
										<ColorSwatch color={option.hex} />
										{option.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				{valueType === 'boolean' && (
					<div className="flex h-8 items-center justify-between gap-3">
						<Label htmlFor={`input-value-${id}`} className="text-xs text-muted-foreground">Value</Label>
						<Switch
							id={`input-value-${id}`}
							data-id={`input-value-${id}`}
							className="nodrag"
							checked={value === true}
							onCheckedChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
						/>
					</div>
				)}
				{valueType === 'enum' && <EnumDefinitionFields inputId={id} />}
				<div className="flex h-8 items-center justify-between gap-3 border-t border-border pt-2">
					<Label htmlFor={`input-export-${id}`} className="text-xs text-muted-foreground">Export</Label>
					<Switch
						id={`input-export-${id}`}
						data-id={`input-export-${id}`}
						className="nodrag"
						checked={node.isExported()}
						onCheckedChange={(exported) => controller.setInputExported(id, exported)}
					/>
				</div>
			</div>
			<TypedHandle id="value" type="source" position={Position.Right} valueType={valueType} />
		</div>
	)
}

function Vector3Input({
	value,
	onChange,
}: {
	value: Vector3Snapshot
	onChange: (value: Vector3Snapshot) => void
}) {
	return (
		<div data-id="input-vector3-fields" className="flex flex-col gap-1.5 text-xs">
			{(['x', 'y', 'z'] as const).map((axis) => (
				<div key={axis} className="flex items-center gap-2">
					<AxisLabel axis={axis} />
					<NumericInput
						data-id={`input-vector3-${axis}`}
						className="nodrag h-8 min-w-0 flex-1 px-2 text-xs"
						value={value[axis]}
						onValueChange={(next) => onChange({ ...value, [axis]: next })}
						step={0.1}
					/>
				</div>
			))}
		</div>
	)
}

function ColorSwatch({ color }: { color: string }) {
	return (
		<span
			aria-hidden="true"
			className="h-3.5 w-3.5 rounded-sm border border-border"
			style={{ backgroundColor: color }}
		/>
	)
}
