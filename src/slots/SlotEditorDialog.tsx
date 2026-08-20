import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { LayoutInstanceBoundsDocument } from '@/layout/LayoutDocument'
import { LayoutNumberSetting } from '@/layout/LayoutNumberSetting'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { SlotSelectorControls } from '@/slots/SlotSelectorControls'
import { PackageCheck, PackageOpen, Ruler } from 'lucide-react'
import { useState } from 'react'

export function SlotEditorDialog({ slotId, compact = false }: { slotId: string; compact?: boolean }) {
	const [open, setOpen] = useState(false)
	const [selectedSlotId, setSelectedSlotId] = useState(slotId)
	const controller = useEditorController()
	const { document } = useGraphSnapshot()
	const layoutData = document.getLayout()
	const assignedSlot = layoutData.slots.find((item) => item.id === slotId)
	if (!assignedSlot) {
		throw new Error(
			`Slot editor cannot find slot "${slotId}". Available slots: ` +
				`${JSON.stringify(layoutData.slots.map((item) => item.id))}.`
		)
	}
	const slot = layoutData.slots.find((item) => item.id === selectedSlotId)
	if (!slot) {
		throw new Error(
			`Slot editor selected unknown slot "${selectedSlotId}". Available ` +
				`slot definitions: ${JSON.stringify(layoutData.slots.map((item) => item.id))}.`
		)
	}
	const rootGraphs = document.getRootGraphs().map((root) => document.requireGraph(root.getGraphId()))
	const setBound = (axis: keyof LayoutInstanceBoundsDocument, boundary: 'min' | 'max', value: number) =>
		controller.setLayoutSlotInstanceBounds(slot.id, {
			...slot.instanceBounds,
			[axis]: { ...slot.instanceBounds[axis], [boundary]: value },
		})

	return (
		<div data-id="slot-editor-launcher" className={compact ? 'shrink-0' : undefined}>
			<Button
				data-id="open-product-type-editor"
				type="button"
				variant="outline"
				className={compact ? 'size-9' : 'w-full'}
				size={compact ? 'icon' : 'default'}
				aria-label={`Edit slot ${assignedSlot.label}`}
				title={`Edit slot ${assignedSlot.label}`}
				onClick={() => {
					setSelectedSlotId(slotId)
					setOpen(true)
				}}
			>
				<PackageOpen />
				{!compact && <>Edit {assignedSlot.label}</>}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					data-id="product-type-editor-dialog"
					className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
				>
					<DialogHeader>
						<div className="flex items-center gap-3 pr-8">
							<DialogTitle className="flex items-center gap-2">
								<PackageOpen className="size-5" aria-hidden="true" />
								{slot.label}
							</DialogTitle>
						</div>
						<DialogDescription className="sr-only">
							Edit slot dimensions and available products.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1">
						<Label>Slot</Label>
						<SlotSelectorControls
							slots={layoutData.slots}
							selectedSlotId={slot.id}
							onSelect={setSelectedSlotId}
							onCreate={(label) => controller.addLayoutSlot(label)}
							onRename={(label) => controller.setLayoutSlotLabel(slot.id, label)}
							onDelete={() => {
								const nextSlot = layoutData.slots.find((item) => item.id !== slot.id)
								if (!nextSlot) throw new Error(`Cannot delete the only slot definition "${slot.id}".`)
								controller.removeLayoutSlot(slot.id)
								setSelectedSlotId(nextSlot.id)
							}}
							deleteDisabled={layoutData.layouts.some((layout) => layout.slotId === slot.id)}
						/>
					</div>

					<section data-id="product-type-dimensions">
						<h3 className="flex items-center gap-2 text-sm font-medium">
							<Ruler className="size-4" aria-hidden="true" />
							Bounds
						</h3>
						<div className="mt-3 flex flex-col gap-2">
							{(['width', 'depth', 'height'] as const).map((axis) => (
								<div
									key={axis}
									data-id={`product-type-${axis}-bounds`}
									className="space-y-2 flex items-center w-full gap-3"
								>
									<Label className="capitalize w-16">{axis}</Label>
									<div className="grid grid-cols-2 gap-2">
										<LayoutNumberSetting
											id={`product-type-${axis}-min`}
											label="Min"
											value={slot.instanceBounds[axis].min}
											min={0}
											max={slot.instanceBounds[axis].max}
											onChange={(value) => setBound(axis, 'min', value)}
										/>
										<LayoutNumberSetting
											id={`product-type-${axis}-max`}
											label="Max"
											value={slot.instanceBounds[axis].max}
											min={Math.max(slot.instanceBounds[axis].min, 0.001)}
											onChange={(value) => setBound(axis, 'max', value)}
										/>
									</div>
								</div>
							))}
						</div>
					</section>

					<Separator />
					<section data-id="product-type-available-products">
						<h3 className="flex items-center gap-2 text-sm font-medium">
							<PackageCheck className="size-4" aria-hidden="true" />
							Available products
						</h3>
						<div className="mt-3 grid grid-cols-2 gap-2">
							{rootGraphs.map((graph) => {
								const checked = slot.graphs.includes(graph.id)
								return (
									<div key={graph.id} className="flex items-center gap-2">
										<Checkbox
										id={`product-type-product-${graph.id}`}
										data-id={`product-type-product-${graph.id}`}
										checked={checked}
										onCheckedChange={(next) =>
												controller.setLayoutSlotGraphs(
													slot.id,
													next === true
														? [...slot.graphs, graph.id]
														: slot.graphs.filter((graphId) => graphId !== graph.id)
												)
											}
										/>
										<Label htmlFor={`product-type-product-${graph.id}`} className="font-normal">
											{graph.label}
										</Label>
									</div>
								)
							})}
						</div>
					</section>
				</DialogContent>
			</Dialog>
		</div>
	)
}
