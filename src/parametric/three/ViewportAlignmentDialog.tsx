import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { DraftNumberInput } from '@/parametric/components/DraftNumberInput'
import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'
import type {
	AlignmentAxis,
	AlignmentMethod,
	ViewportAlignmentRequest,
} from '@/parametric/three/editor/ViewportAlignment'

const axes: AlignmentAxis[] = ['x', 'y', 'z']
const methods: Array<{ value: AlignmentMethod; label: string }> = [
	{ value: 'min', label: 'Min' },
	{ value: 'middle', label: 'Mid' },
	{ value: 'max', label: 'Max' },
]

interface ViewportAlignmentDialogProps {
	open: boolean
	nodeId: string
	initialSettings: ViewportAlignmentRequest
	onOpenChange: (open: boolean) => void
	onApply: (request: ViewportAlignmentRequest) => boolean
}

export function ViewportAlignmentDialog({
	open,
	nodeId,
	initialSettings,
	onOpenChange,
	onApply,
}: ViewportAlignmentDialogProps) {
	const [enabledAxes, setEnabledAxes] = useState<Record<AlignmentAxis, boolean>>(
		() => ({ ...initialSettings.enabledAxes })
	)
	const [alignmentMethods, setAlignmentMethods] = useState<Record<AlignmentAxis, AlignmentMethod>>(
		() => ({ ...initialSettings.methods })
	)
	const [point, setPoint] = useState<Vector3Snapshot>(() => ({ ...initialSettings.point }))

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-id={`viewport-alignment-dialog-${nodeId}`} className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Align viewport items</DialogTitle>
					<DialogDescription>
						Align the current preview bounds and store the resulting translation on node
						{' '}“{nodeId}”.
					</DialogDescription>
				</DialogHeader>
				<div data-id="viewport-alignment-axes" className="grid gap-3 py-2">
					{axes.map((axis) => (
						<div
							key={axis}
							data-id={`viewport-alignment-axis-${axis}`}
							className="grid grid-cols-[auto_2rem_1fr] items-center gap-3"
						>
							<Checkbox
								id={`viewport-alignment-${axis}-enabled`}
								checked={enabledAxes[axis]}
								onCheckedChange={(checked) => setEnabledAxes({
									...enabledAxes,
									[axis]: checked === true,
								})}
							/>
							<Label htmlFor={`viewport-alignment-${axis}-enabled`} className="uppercase">
								{axis}
							</Label>
							<Select
								value={alignmentMethods[axis]}
								disabled={!enabledAxes[axis]}
								onValueChange={(value) => setAlignmentMethods({
									...alignmentMethods,
									[axis]: value as AlignmentMethod,
								})}
							>
								<SelectTrigger data-id={`viewport-alignment-${axis}-method`}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{methods.map((method) => (
										<SelectItem key={method.value} value={method.value}>
											{method.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					))}
				</div>
				<div data-id="viewport-alignment-point" className="grid gap-2">
					<Label>Alignment point</Label>
					<div className="grid grid-cols-3 gap-2">
						{axes.map((axis) => (
							<div key={axis} className="grid gap-1">
								<Label htmlFor={`viewport-alignment-point-${axis}`} className="uppercase">
									{axis}
								</Label>
								<DraftNumberInput
									id={`viewport-alignment-point-${axis}`}
									data-id={`viewport-alignment-point-${axis}`}
									value={point[axis]}
									onValueChange={(value) => setPoint({ ...point, [axis]: value })}
								/>
							</div>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						data-id="viewport-alignment-close"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button
						type="button"
						data-id="viewport-alignment-apply"
						onClick={() => {
							if (onApply({ enabledAxes, methods: alignmentMethods, point })) {
								onOpenChange(false)
							}
						}}
					>
						Apply
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
