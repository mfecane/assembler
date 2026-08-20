import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { MODEL_AXIS_STYLES, ModelAxisBadge } from '@/models/ModelAxisBadge'
import type { ModelBoundingBoxMetadata } from '@/models/ModelBoundsMetadata'
import { ModelPanelSection } from '@/models/ModelPanelSection'
import {
	ModelStretchAxis,
	type ModelGeometryAxis,
	type ModelTextureAxis,
	type StretchBoundary,
} from '@/models/ModelStretchMetadata'
import { createModelStretchSizeConstraint } from '@/models/ModelStretchSizeConstraint'
import { NumericInput } from '@/parametric/components/NumericInput'
import { Link2, Move3d, Plus, RotateCcw, Scaling, Trash2 } from 'lucide-react'

const GEOMETRY_AXES: ModelGeometryAxis[] = ['x', 'y', 'z']

export function ModelStretchPanel({
	stretchAxes,
	stretchEnabled,
	modelSize,
	previewSize,
	activeStretchAxis,
	scaleToolActive,
	disabled,
	onEnabledChange,
	onAdd,
	onAddBox,
	onUpdate,
	onBoundaryChange,
	onRemoveBox,
	onRemove,
	onToggleBoxEditing,
	onToggleScaleTool,
	onPreviewSizeChange,
	onResetPreview,
}: {
	stretchAxes: ModelStretchAxis[]
	stretchEnabled: boolean
	modelSize: ModelBoundingBoxMetadata['size']
	previewSize: ModelBoundingBoxMetadata['size']
	activeStretchAxis: ModelGeometryAxis | null
	scaleToolActive: boolean
	disabled: boolean
	onEnabledChange: (enabled: boolean) => void
	onAdd: (axis: ModelGeometryAxis) => void
	onAddBox: (axis: ModelGeometryAxis) => void
	onUpdate: (axis: ModelStretchAxis) => void
	onBoundaryChange: (
		axis: ModelGeometryAxis,
		boxIndex: number,
		boundary: StretchBoundary,
		value: number
	) => void
	onRemoveBox: (axis: ModelGeometryAxis, boxIndex: number) => void
	onRemove: (axis: ModelGeometryAxis) => void
	onToggleBoxEditing: (axis: ModelGeometryAxis) => void
	onToggleScaleTool: () => void
	onPreviewSizeChange: (axis: ModelGeometryAxis, size: number) => void
	onResetPreview: () => void
}) {
	const availableAxes = GEOMETRY_AXES.filter((axis) => !stretchAxes.some((item) => item.axis === axis))
	const previewChanged = stretchAxes.some((item) => previewSize[item.axis] !== modelSize[item.axis])
	const controlsDisabled = disabled || !stretchEnabled

	return (
		<ModelPanelSection
			id="model-stretch-panel"
			title="Stretch"
			icon={Scaling}
			status={
				<Badge variant={stretchEnabled ? 'secondary' : 'outline'}>
					{stretchEnabled ? `${stretchAxes.length} ${stretchAxes.length === 1 ? 'axis' : 'axes'}` : 'Off'}
				</Badge>
			}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<Label htmlFor="stretch-enabled">Enable stretch</Label>
					<p className="mb-0 mt-1 text-xs text-muted">Configure stretch rules</p>
				</div>
				<Switch
					id="stretch-enabled"
					data-id="stretch-enabled"
					checked={stretchEnabled}
					disabled={disabled}
					onCheckedChange={onEnabledChange}
				/>
			</div>

			<div>
				<div className="mb-2 flex items-center gap-2">
					<Plus className="size-4 text-muted-foreground" aria-hidden="true" />
					<p className="m-0 text-sm font-medium">Add geometry axis</p>
				</div>
				<ButtonGroup data-id="add-stretch-axis-buttons" className="w-full">
					{GEOMETRY_AXES.map((axis) => (
						<Button
							key={axis}
							data-id={`add-stretch-axis-${axis}`}
							type="button"
							variant="outline"
							className="flex-1"
							disabled={controlsDisabled || !availableAxes.includes(axis)}
							aria-label={`Add ${axis.toUpperCase()} stretch axis`}
							onClick={() => onAdd(axis)}
						>
							<Plus />
							{axis.toUpperCase()}
						</Button>
					))}
				</ButtonGroup>
			</div>

			<div data-id="stretch-axis-list" className="space-y-3">
				{stretchAxes.length === 0 ? (
					<p className="m-0 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
						No stretch axes configured. Add X, Y, or Z to define stretch boxes.
					</p>
				) : (
					stretchAxes.map((stretchAxis) => (
						<StretchAxisFields
							key={stretchAxis.axis}
							stretchAxis={stretchAxis}
							modelAxisSize={modelSize[stretchAxis.axis]}
							editing={activeStretchAxis === stretchAxis.axis}
							disabled={controlsDisabled}
							textureAxisOwners={findTextureAxisOwners(stretchAxes, stretchAxis.axis)}
							onUpdate={onUpdate}
							onAddBox={onAddBox}
							onBoundaryChange={onBoundaryChange}
							onRemoveBox={onRemoveBox}
							onRemove={onRemove}
							onToggleBoxEditing={onToggleBoxEditing}
						/>
					))
				)}
			</div>

			{stretchAxes.length > 0 && (
				<>
					<Separator />
					<div
						data-id="stretch-preview-tool"
						className="rounded-md border border-border bg-background/40 p-3"
					>
						<div className="mb-3">
							<div className="flex items-center gap-2">
								<Scaling className="size-4 text-muted-foreground" aria-hidden="true" />
								<p className="m-0 text-sm font-medium">Scale preview</p>
							</div>
							<p className="mb-0 mt-1 text-xs text-muted-foreground">
								Test temporary target sizes. Preview values are never saved.
							</p>
						</div>
						<Toggle
							data-id="toggle-stretch-scale-tool"
							variant="outline"
							pressed={scaleToolActive}
							className="w-full"
							disabled={controlsDisabled}
							onPressedChange={onToggleScaleTool}
						>
							<Scaling />
							{scaleToolActive ? 'Finish scale preview' : 'Scale in viewport'}
						</Toggle>
						{scaleToolActive && (
							<div className="mt-3 space-y-3">
								<div className="grid auto-cols-fr grid-flow-col gap-2">
									{stretchAxes.map((stretchAxis) => (
										<SizeInput
											key={stretchAxis.axis}
											axis={stretchAxis.axis}
											stretchAxis={stretchAxis}
											modelAxisSize={modelSize[stretchAxis.axis]}
											value={previewSize[stretchAxis.axis]}
											disabled={controlsDisabled || activeStretchAxis !== null}
											onCommit={onPreviewSizeChange}
										/>
									))}
								</div>
								<Button
									data-id="reset-stretch-preview"
									type="button"
									variant="outline"
									className="w-full"
									disabled={controlsDisabled || !previewChanged}
									onClick={onResetPreview}
								>
									<RotateCcw />
									Reset source size
								</Button>
							</div>
						)}
					</div>
				</>
			)}
		</ModelPanelSection>
	)
}

function findTextureAxisOwners(
	stretchAxes: ModelStretchAxis[],
	currentAxis: ModelGeometryAxis
): Map<ModelTextureAxis, ModelGeometryAxis> {
	return new Map(
		stretchAxes.flatMap((item) =>
			item.axis !== currentAxis && item.textureAxis ? [[item.textureAxis, item.axis]] : []
		)
	)
}

function StretchAxisFields({
	stretchAxis,
	modelAxisSize,
	editing,
	disabled,
	textureAxisOwners,
	onUpdate,
	onAddBox,
	onBoundaryChange,
	onRemoveBox,
	onRemove,
	onToggleBoxEditing,
}: {
	stretchAxis: ModelStretchAxis
	modelAxisSize: number
	editing: boolean
	disabled: boolean
	textureAxisOwners: Map<ModelTextureAxis, ModelGeometryAxis>
	onUpdate: (axis: ModelStretchAxis) => void
	onAddBox: (axis: ModelGeometryAxis) => void
	onBoundaryChange: (
		axis: ModelGeometryAxis,
		boxIndex: number,
		boundary: StretchBoundary,
		value: number
	) => void
	onRemoveBox: (axis: ModelGeometryAxis, boxIndex: number) => void
	onRemove: (axis: ModelGeometryAxis) => void
	onToggleBoxEditing: (axis: ModelGeometryAxis) => void
}) {
	const axis = stretchAxis.axis
	return (
		<div
			data-id={`stretch-axis-${axis}`}
			className={cn(
				'rounded-md border border-l-4 border-border bg-background/40 p-3',
				MODEL_AXIS_STYLES[axis].border
			)}
		>
			<div className="mb-3 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<ModelAxisBadge axis={axis} />
					<p className="m-0 text-sm font-semibold">Geometry axis</p>
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							data-id={`remove-stretch-axis-${axis}`}
							type="button"
							size="icon"
							variant="ghost"
							className="size-8 text-destructive hover:text-destructive"
							disabled={disabled}
							aria-label={`Remove ${axis.toUpperCase()} stretch axis`}
						>
							<Trash2 />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent data-id={`remove-stretch-axis-${axis}-dialog`}>
						<AlertDialogHeader>
							<AlertDialogTitle>Remove {axis.toUpperCase()} stretch axis?</AlertDialogTitle>
							<AlertDialogDescription>
								Its stretch boxes and UV scaling assignment will be removed from the metadata draft.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								onClick={() => onRemove(axis)}
							>
								Remove axis
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			<Toggle
				data-id={`edit-stretch-boxes-${axis}`}
				variant="outline"
				pressed={editing}
				className="mb-3 w-full"
				disabled={disabled}
				onPressedChange={() => onToggleBoxEditing(axis)}
			>
				<Move3d />
				{editing ? 'Finish viewport adjustment' : 'Adjust boxes in viewport'}
			</Toggle>

			<div data-id={`stretch-box-list-${axis}`} className="space-y-2">
				{stretchAxis.boxes.map((box, boxIndex) => {
					const boundaryGap = Math.max(modelAxisSize / 1_000, 0.000001)
					return (
						<div
							key={boxIndex}
							data-id={`stretch-box-${axis}-${boxIndex}`}
							className="rounded-md border border-border p-2"
						>
							<div className="mb-2 flex items-center justify-between gap-2">
								<p className="m-0 text-xs font-medium">Box {boxIndex + 1}</p>
								{stretchAxis.boxes.length > 1 && (
									<Button
										data-id={`remove-stretch-box-${axis}-${boxIndex}`}
										type="button"
										size="icon"
										variant="ghost"
										className="size-7 text-destructive hover:text-destructive"
										disabled={disabled}
										aria-label={`Remove ${axis.toUpperCase()} stretch box ${boxIndex + 1}`}
										onClick={() => onRemoveBox(axis, boxIndex)}
									>
										<Trash2 />
									</Button>
								)}
							</div>
							<div className="grid grid-cols-2 gap-2">
								<BoundaryInput
									label="Minimum"
									boundary="min"
									boxIndex={boxIndex}
									value={box.min}
									axis={axis}
									modelAxisSize={modelAxisSize}
									min={stretchAxis.boxes[boxIndex - 1]?.max}
									max={box.max - boundaryGap}
									disabled={disabled}
									onValueChange={(value) => onBoundaryChange(axis, boxIndex, 'min', value)}
								/>
								<BoundaryInput
									label="Maximum"
									boundary="max"
									boxIndex={boxIndex}
									value={box.max}
									axis={axis}
									modelAxisSize={modelAxisSize}
									min={box.min + boundaryGap}
									max={stretchAxis.boxes[boxIndex + 1]?.min}
									disabled={disabled}
									onValueChange={(value) => onBoundaryChange(axis, boxIndex, 'max', value)}
								/>
							</div>
						</div>
					)
				})}
				<Button
					data-id={`add-stretch-box-${axis}`}
					type="button"
					variant="outline"
					className="w-full"
					disabled={disabled}
					onClick={() => onAddBox(axis)}
				>
					<Plus />
					Add box
				</Button>
			</div>

			<div className="mt-3 space-y-1.5">
				<div className="flex items-center gap-2">
					<Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
					<Label htmlFor={`stretch-texture-axis-${axis}`}>Scale texture coordinate</Label>
				</div>
				<Select
					value={stretchAxis.textureAxis ?? 'none'}
					disabled={disabled}
					onValueChange={(value) =>
						onUpdate(stretchAxis.withTextureAxis(value === 'none' ? null : (value as ModelTextureAxis)))
					}
				>
					<SelectTrigger id={`stretch-texture-axis-${axis}`} data-id={`stretch-texture-axis-${axis}`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Do not scale UVs</SelectItem>
						<SelectItem value="u" disabled={textureAxisOwners.has('u')}>
							U coordinate
						</SelectItem>
						<SelectItem value="v" disabled={textureAxisOwners.has('v')}>
							V coordinate
						</SelectItem>
					</SelectContent>
				</Select>
				{textureAxisOwners.size > 0 && (
					<p className="m-0 text-xs text-muted-foreground">{describeTextureAxisOwners(textureAxisOwners)}</p>
				)}
			</div>
		</div>
	)
}

function describeTextureAxisOwners(owners: Map<ModelTextureAxis, ModelGeometryAxis>): string {
	return [...owners.entries()]
		.map(
			([textureAxis, geometryAxis]) =>
				`${textureAxis.toUpperCase()} is already assigned to ${geometryAxis.toUpperCase()}`
		)
		.join(' · ')
}

function BoundaryInput({
	label,
	boundary,
	boxIndex,
	value,
	axis,
	modelAxisSize,
	min,
	max,
	disabled,
	onValueChange,
}: {
	label: string
	boundary: StretchBoundary
	boxIndex: number
	value: number
	axis: ModelGeometryAxis
	modelAxisSize: number
	min?: number
	max?: number
	disabled: boolean
	onValueChange: (value: number) => void
}) {
	const fieldId = `stretch-${axis}-${boxIndex}-${boundary}`
	return (
		<div data-id={`stretch-${axis}-${boxIndex}-${boundary}-field`} className="space-y-1.5">
			<Label htmlFor={fieldId} className={cn('text-xs', MODEL_AXIS_STYLES[axis].text)}>
				{label}
			</Label>
			<NumericInput
				id={fieldId}
				value={value}
				min={min}
				max={max}
				roundStep={0.000001}
				dragStep={Math.max(modelAxisSize / 1_000, 0.000001)}
				className="h-9 w-full"
				disabled={disabled}
				onValueChange={onValueChange}
			/>
		</div>
	)
}

function SizeInput({
	axis,
	stretchAxis,
	modelAxisSize,
	value,
	disabled,
	onCommit,
}: {
	axis: ModelGeometryAxis
	stretchAxis: ModelStretchAxis
	modelAxisSize: number
	value: number
	disabled: boolean
	onCommit: (axis: ModelGeometryAxis, value: number) => void
}) {
	const fieldId = `stretch-preview-size-${axis}`
	const constraint = createModelStretchSizeConstraint(modelAxisSize, stretchAxis)
	return (
		<div data-id={`stretch-preview-size-${axis}-field`} className="space-y-1.5">
			<div className="flex items-center gap-1.5">
				<ModelAxisBadge axis={axis} className="px-1.5" />
				<Label htmlFor={fieldId} className="text-xs">
					Size
				</Label>
			</div>
			<NumericInput
				id={fieldId}
				value={value}
				min={constraint.min}
				max={constraint.max}
				roundStep={0.000001}
				className="h-9 w-full"
				disabled={disabled}
				onValueChange={(next) => onCommit(axis, next)}
			/>
		</div>
	)
}
