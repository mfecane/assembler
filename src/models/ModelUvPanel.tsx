import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ModelPanelSection } from '@/models/ModelPanelSection'
import type { ModelUvAttribute } from '@/models/ModelUvAttribute'
import { CheckCircle2, CircleSlash2, Grid3X3, TriangleAlert } from 'lucide-react'

export function ModelUvPanel({
	uvViewEnabled,
	uvAttribute,
	disabled,
	onUvViewChange,
}: {
	uvViewEnabled: boolean
	uvAttribute: ModelUvAttribute | null
	disabled: boolean
	onUvViewChange: (enabled: boolean) => void
}) {
	const hasUvs = uvAttribute !== null
	const hasDegenerateUvs = uvAttribute?.isDegenerate() ?? false

	return (
		<ModelPanelSection
			id="model-uv-panel"
			title="UVs"
			icon={Grid3X3}
			status={
				hasDegenerateUvs ? (
					<TriangleAlert className="size-4 text-danger" aria-label="UV issue" />
				) : (
					<Badge variant="outline">{hasUvs ? 'Available' : 'Missing'}</Badge>
				)
			}
		>
			<div data-id="model-uv-summary" className="flex items-start gap-2 text-xs text-muted-foreground">
				{hasDegenerateUvs ? (
					<TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
				) : hasUvs ? (
					<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
				) : (
					<CircleSlash2 className="mt-0.5 size-4 shrink-0" />
				)}
				<div>
					<p className="m-0 font-medium text-foreground">
						{hasDegenerateUvs
							? 'Degenerate UV attribute'
							: hasUvs
								? 'UV attribute found'
								: 'No UV attribute'}
					</p>
					<p className="mb-0 mt-1">
						{uvAttribute ? describeUvAttribute(uvAttribute) : 'This model does not contain UV coordinates.'}
					</p>
				</div>
			</div>
			<div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
				<Checkbox
					id="uv-view-enabled"
					data-id="uv-view-enabled"
					checked={uvViewEnabled}
					disabled={disabled || !hasUvs}
					onCheckedChange={(checked) => onUvViewChange(checked === true)}
				/>
				<Label htmlFor="uv-view-enabled">Preview UVs</Label>
			</div>
		</ModelPanelSection>
	)
}

function describeUvAttribute(attribute: ModelUvAttribute): string {
	const count = attribute.vertexCount.toLocaleString()
	if (attribute.isCollapsedToPoint()) {
		return `All ${count} UV entries collapse to U ${attribute.minU}, V ${attribute.minV}. `
	}
	if (attribute.isDegenerate()) {
		return `${count} UV entries have zero ${attribute.minU === attribute.maxU ? 'U' : 'V'} span. `
	}
	return `${count} UV coordinate ${attribute.vertexCount === 1 ? 'entry' : 'entries'}`
}
