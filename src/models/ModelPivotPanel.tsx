import { Crosshair, RotateCcw, Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { ModelPanelSection } from '@/models/ModelPanelSection'
import type { ModelPivot, ModelPivotEditingMode } from '@/models/ModelPivotMetadata'

export function ModelPivotPanel({
	pivot,
	editingMode,
	fineTuneEnabled,
	disabled,
	onReset,
	onToggleEditing,
	onToggleFineTune,
}: {
	pivot: ModelPivot
	editingMode: ModelPivotEditingMode | null
	fineTuneEnabled: boolean
	disabled: boolean
	onReset: () => void
	onToggleEditing: () => void
	onToggleFineTune: () => void
}) {
	return (
		<ModelPanelSection id="model-pivot-panel" title="Pivot" icon={Crosshair}>
			<Table data-id="model-pivot-values">
				<TableBody>
					<TableRow>
						<TableCell className="font-medium">Position</TableCell>
						<TableCell className="select-text text-right font-mono text-xs text-red-400">
							X {pivot.x.toFixed(2)}
						</TableCell>
						<TableCell className="select-text text-right font-mono text-xs text-emerald-400">
							Y {pivot.y.toFixed(2)}
						</TableCell>
						<TableCell className="select-text text-right font-mono text-xs text-sky-400">
							Z {pivot.z.toFixed(2)}
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
			<div className="flex gap-2">
				<Button
					data-id="reset-model-pivot"
					type="button"
					variant="outline"
					className="flex-1"
					disabled={disabled || (pivot.x === 0 && pivot.y === 0 && pivot.z === 0)}
					onClick={onReset}
				>
					<RotateCcw /> Reset
				</Button>
				<Button
					data-id="toggle-model-pivot-editing"
					type="button"
					variant={editingMode ? 'secondary' : 'outline'}
					className="flex-1"
					disabled={disabled}
					aria-pressed={Boolean(editingMode)}
					onClick={onToggleEditing}
				>
					<Crosshair /> {editingMode ? 'Finish editing' : 'Edit'}
				</Button>
			</div>
			{editingMode && (
				<div data-id="model-pivot-editing-options" className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2 text-sm font-medium">
							<Scan className="size-4" /> Select a point
						</div>
						<label className="flex items-center gap-2 text-sm">
							<span>Fine tune</span>
							<Switch
								data-id="model-pivot-fine-tune"
								checked={fineTuneEnabled}
								disabled={disabled}
								onCheckedChange={onToggleFineTune}
							/>
						</label>
					</div>
					<p className="m-0 text-xs text-muted-foreground">
						Choose a corner, edge center, face center, or the model center in the viewport.
					</p>
				</div>
			)}
		</ModelPanelSection>
	)
}
