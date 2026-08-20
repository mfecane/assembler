import type { Axis } from '@/parametric/model/GraphNode'

export const AXIS_TEXT_CLASSES: Record<Axis, string> = {
	x: 'text-red-400',
	y: 'text-emerald-400',
	z: 'text-sky-400',
}

export const AXIS_COLORS: Record<Axis, string> = {
	x: '#f87171',
	y: '#34d399',
	z: '#38bdf8',
}

export function AxisLabel({ axis }: { axis: Axis }) {
	return <span className={AXIS_TEXT_CLASSES[axis]}>{axis.toUpperCase()}</span>
}
