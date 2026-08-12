import type { Vector3Snapshot } from '@/parametric/model/Vector3Value'

export type AlignmentMethod = 'min' | 'middle' | 'max'
export type AlignmentAxis = 'x' | 'y' | 'z'

export interface ViewportBoundsSnapshot {
	min: Vector3Snapshot
	max: Vector3Snapshot
}

export interface ViewportAlignmentRequest {
	enabledAxes: Record<AlignmentAxis, boolean>
	methods: Record<AlignmentAxis, AlignmentMethod>
	point: Vector3Snapshot
}

export function createDefaultViewportAlignmentRequest(): ViewportAlignmentRequest {
	return {
		enabledAxes: { x: true, y: true, z: true },
		methods: { x: 'middle', y: 'middle', z: 'middle' },
		point: { x: 0, y: 0, z: 0 },
	}
}

export function copyViewportAlignmentRequest(
	request: ViewportAlignmentRequest
): ViewportAlignmentRequest {
	return {
		enabledAxes: { ...request.enabledAxes },
		methods: { ...request.methods },
		point: { ...request.point },
	}
}

export function calculateAlignedTranslation(
	current: Vector3Snapshot,
	bounds: ViewportBoundsSnapshot,
	request: ViewportAlignmentRequest
): Vector3Snapshot {
	const translation = { ...current }
	for (const axis of ['x', 'y', 'z'] as const) {
		if (!request.enabledAxes[axis]) continue
		const method = request.methods[axis]
		const alignedCoordinate = method === 'min'
			? bounds.min[axis]
			: method === 'max'
				? bounds.max[axis]
				: (bounds.min[axis] + bounds.max[axis]) / 2
		translation[axis] += request.point[axis] - alignedCoordinate
	}
	return translation
}
