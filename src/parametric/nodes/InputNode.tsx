import type { NodeProps } from '@xyflow/react'
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
import { ChoiceSetSelector } from '@/parametric/components/ChoiceSetSelector'
import { AxisLabel } from '@/parametric/components/AxisLabel'
import { GeometryPreviewButton } from '@/parametric/components/GeometryPreviewButton'
import { MaterialSelect } from '@/parametric/components/MaterialSelect'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { PrimitiveArrayEditor } from '@/parametric/components/PrimitiveArrayEditor'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { COLOR_PALETTE } from '@/parametric/model/ColorPalette'
import { InputGraphNode, type PrimitiveArrayElementType } from '@/parametric/model/GraphNode'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export function InputNode({ id }: NodeProps<ParametricFlowNode>) {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(id)
	if (!(node instanceof InputGraphNode)) return null
	const valueType = node.getValueType()
	const value = node.getValue()
	const valueConnected = model.getEdges().some((edge) => (
		edge.targetNodeId === id && edge.targetPort === 'value'
	))

	return (
		<NodeSurface
			nodeId={id}
			dataId={`input-node-${id}`}
			actions={valueType === 'geometry' ? <GeometryPreviewButton nodeId={id} /> : undefined}
			className="min-w-52"
		>
			<div data-id={`input-node-fields-${id}`} className="flex flex-col gap-2">
				{valueType !== 'enum' && (
					<NodePortRow
						nodeId={id}
						portId="value"
						valueType={valueType}
						direction="both"
						label={valueType === 'geometry' ? 'Geometry' : undefined}
					>
						{valueType === 'number' && (
							<NumericInput
								data-id={`input-value-${id}`}
								className="nodrag h-8 max-w-full text-xs"
								value={typeof value === 'number' ? value : 0}
								disabled={valueConnected}
								onValueChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
								step={0.1}
							/>
						)}
						{valueType === 'primitiveArray' && (
							<PrimitiveArrayFields
								id={id}
								elementType={node.getPrimitiveArrayElementType() ?? 'number'}
								enumId={node.getEnumId()}
								values={Array.isArray(value) ? value.filter((item): item is number | boolean => (
									typeof item === 'number' || typeof item === 'boolean'
								)) : []}
								disabled={valueConnected}
							/>
						)}
						{valueType === 'vector3' && (
							<Vector3Input
								value={value as Vector3Snapshot}
								disabled={valueConnected}
								onChange={(next) => controller.updateGraphInput(id, { defaultValue: next })}
							/>
						)}
						{valueType === 'materialInstance' && (
							<MaterialSelect
								id={`input-value-${id}`}
								dataId={`input-value-${id}`}
								value={typeof value === 'string' ? value : 'wood'}
								disabled={valueConnected}
								onValueChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
								ariaLabel={`Material for ${node.getName() || id}`}
							/>
						)}
						{valueType === 'color' && (
							<Select
								value={typeof value === 'string' ? value : '#ffffff'}
								disabled={valueConnected}
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
							<div className="flex h-8 items-center justify-end">
								<Switch
									id={`input-value-${id}`}
									data-id={`input-value-${id}`}
									className="nodrag"
									checked={value === true}
									disabled={valueConnected}
									onCheckedChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })}
								/>
							</div>
						)}
					</NodePortRow>
				)}
				{valueType === 'materialInstance' && (
					<NodePortRow nodeId={id} portId="color" valueType="color" direction="input" label="Color" />
				)}
				{valueType === 'enum' && (
					<EnumDefinitionFields inputId={id} valueConnected={valueConnected} />
				)}
				<div data-id={`input-export-control-${id}`} className="flex h-8 items-center justify-between gap-3">
					<Label htmlFor={`input-export-${id}`} className="text-xs text-muted-foreground">Exported</Label>
					<Switch
						id={`input-export-${id}`}
						data-id={`input-export-${id}`}
						className="nodrag"
						checked={node.isExported()}
						onCheckedChange={(exported) => controller.setInputExported(id, exported)}
					/>
				</div>
			</div>
		</NodeSurface>
	)
}

function PrimitiveArrayFields({ id, elementType, enumId, values, disabled }: {
	id: string
	elementType: PrimitiveArrayElementType
	enumId: string | undefined
	values: Array<number | boolean>
	disabled: boolean
}) {
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const definition = enumId ? document.requireEnumDefinition(enumId) : undefined
	return (
		<div data-id={`primitive-array-fields-${id}`} className="flex flex-col gap-2">
			<Select value={elementType} onValueChange={(value) => controller.setPrimitiveArrayElementType(
				id, value as PrimitiveArrayElementType
			)}>
				<SelectTrigger data-id={`primitive-array-type-${id}`} className="nodrag h-8 text-xs" aria-label="Array value type">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="number">Number</SelectItem>
					<SelectItem value="boolean">Boolean</SelectItem>
					<SelectItem value="enum">Choice</SelectItem>
				</SelectContent>
			</Select>
			{elementType === 'enum' && definition && <ChoiceSetSelector
				dataId={`primitive-array-enum-${id}`}
				definition={definition}
				definitions={document.getEnumDefinitions()}
				usageCount={document.getEnumUsageCount(definition.id)}
				onDefinitionChange={(nextEnumId) => controller.setGraphInputEnum(id, nextEnumId)}
				onRename={(name) => controller.renameEnum(definition.id, name)}
				onAddOption={() => controller.addEnumOption(definition.id)}
				onRenameOption={(index, option) => controller.renameEnumOption(definition.id, index, option)}
				onRemoveOption={(index) => controller.removeEnumOption(definition.id, index)}
				onMoveOption={(sourceIndex, targetIndex) => controller.moveEnumOption(
					definition.id, sourceIndex, targetIndex
				)}
				onCreateDefinition={() => controller.createEnumForGraphInput(id)}
				onDeleteDefinition={() => controller.deleteEnumForGraphInput(id)}
				canDeleteDefinition={document.getEnumDefinitions().length > 1
					&& document.getEnumUsageCount(definition.id) === 1}
			/>}
			<PrimitiveArrayEditor dataId={`input-value-${id}`} elementType={elementType} values={values}
				options={definition?.options ?? []}
				disabled={disabled}
				onChange={(defaultValue) => controller.updateGraphInput(id, { defaultValue })} />
		</div>
	)
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
		<div data-id="input-vector3-fields" className="flex flex-col gap-1.5 text-xs">
			{(['x', 'y', 'z'] as const).map((axis) => (
				<div key={axis} className="flex items-center gap-2">
					<AxisLabel axis={axis} />
					<NumericInput
						data-id={`input-vector3-${axis}`}
						className="nodrag h-8 min-w-0 flex-1 px-2 text-xs"
						value={value[axis]}
						disabled={disabled}
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
