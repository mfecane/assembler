import { Box, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ModelBoundingBoxMetadata } from '@/models/ModelBoundsMetadata'
import { ModelPanelSection } from '@/models/ModelPanelSection'

export function ModelBoundsPanel({
	boundsPendingSave,
	boundingBox,
	disabled,
	onRead,
}: {
	boundingBox: ModelBoundingBoxMetadata
	boundsPendingSave: boolean
	disabled: boolean
	onRead: () => void
}) {
	return (
		<ModelPanelSection
			id="model-bounding-box"
			title="Bounding box"
			icon={Box}
			status={boundsPendingSave ? <Badge>Unsaved</Badge> : undefined}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="m-0 text-sm font-medium">Source measurements</p>
					<p className="mb-0 mt-1 text-xs text-muted-foreground">
						Size and center read from the model geometry.
					</p>
				</div>
				<Button
					data-id="read-model-bounds"
					type="button"
					size="sm"
					variant="outline"
					className="shrink-0"
					disabled={disabled}
					onClick={onRead}
				>
					<RefreshCw />
					Refresh
				</Button>
			</div>
			<Table data-id="model-bounding-box-values">
				<TableHeader>
					<TableRow>
						<TableHead>Measure</TableHead>
						<TableHead className="text-right text-red-400">X</TableHead>
						<TableHead className="text-right text-emerald-400">Y</TableHead>
						<TableHead className="text-right text-sky-400">Z</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<BoundsRow label="Size" values={boundingBox.size} />
					<BoundsRow label="Center" values={boundingBox.center} />
				</TableBody>
			</Table>
		</ModelPanelSection>
	)
}

function BoundsRow({ label, values }: { label: string; values: ModelBoundingBoxMetadata['size'] }) {
	return (
		<TableRow data-id={`model-bounding-box-${label.toLowerCase()}`}>
			<TableCell className="font-medium">{label}</TableCell>
			<TableCell className="select-text text-right font-mono text-xs">{values.x.toFixed(2)}</TableCell>
			<TableCell className="select-text text-right font-mono text-xs">{values.y.toFixed(2)}</TableCell>
			<TableCell className="select-text text-right font-mono text-xs">{values.z.toFixed(2)}</TableCell>
		</TableRow>
	)
}
