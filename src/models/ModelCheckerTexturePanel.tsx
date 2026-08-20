import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
	MAX_CHECKER_TEXTURE_SCALE,
	MIN_CHECKER_TEXTURE_SCALE,
} from '@/models/ModelCheckerTexture'
import { ModelPanelSection } from '@/models/ModelPanelSection'

export function ModelCheckerTexturePanel({
	enabled,
	scale,
	disabled,
	onEnabledChange,
	onScaleChange,
}: {
	enabled: boolean
	scale: number
	disabled: boolean
	onEnabledChange: (enabled: boolean) => void
	onScaleChange: (scale: number) => void
}) {
	return (
		<ModelPanelSection id="model-preview-options-panel" title="Preview" icon={Eye}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<Label htmlFor="checker-texture-enabled">Checker texture</Label>
					<p className="mb-0 mt-1 text-xs text-muted-foreground">
						Temporarily reveal UV scale and distortion.
					</p>
				</div>
				<Switch
					id="checker-texture-enabled"
					data-id="checker-texture-enabled"
					checked={enabled}
					disabled={disabled}
					aria-label="Toggle checker texture"
					onCheckedChange={onEnabledChange}
				/>
			</div>
			<div className="rounded-md bg-muted/10 p-3 space-y-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Grid2X2 className="size-4 text-muted-foreground" aria-hidden="true" />
						<Label htmlFor="checker-texture-scale">Tile scale</Label>
					</div>
					<span className="text-xs tabular-nums text-muted-foreground">{scale}×</span>
				</div>
				<Slider
					id="checker-texture-scale"
					data-id="checker-texture-scale"
					min={MIN_CHECKER_TEXTURE_SCALE}
					max={MAX_CHECKER_TEXTURE_SCALE}
					step={1}
					value={[scale]}
					disabled={disabled || !enabled}
					onValueChange={([value]) => onScaleChange(value)}
				/>
			</div>
		</ModelPanelSection>
	)
}
import { Eye, Grid2X2 } from 'lucide-react'
