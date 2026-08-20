import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ModelGeometryAxis } from '@/models/ModelStretchMetadata'

export const MODEL_AXIS_STYLES: Record<
	ModelGeometryAxis,
	{ badge: string; border: string; text: string }
> = {
	x: {
		badge: 'border-red-400/40 bg-red-400/10 text-red-400',
		border: 'border-l-red-400',
		text: 'text-red-400',
	},
	y: {
		badge: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
		border: 'border-l-emerald-400',
		text: 'text-emerald-400',
	},
	z: {
		badge: 'border-sky-400/40 bg-sky-400/10 text-sky-400',
		border: 'border-l-sky-400',
		text: 'text-sky-400',
	},
}

export function ModelAxisBadge({ axis, className }: { axis: ModelGeometryAxis; className?: string }) {
	return (
		<Badge variant="outline" className={cn('font-mono', MODEL_AXIS_STYLES[axis].badge, className)}>
			{axis.toUpperCase()}
		</Badge>
	)
}
