import type {
	ModelGeometryAxis,
	StretchBoundary,
} from '@/models/ModelStretchMetadata'

export type CanvasEventType =
	| 'pointer-down'
	| 'pointer-move'
	| 'pointer-up'
	| 'click'
	| 'double-click'
	| 'drag-start'
	| 'drag'
	| 'drag-end'
	| 'wheel'

export type WidgetEventType =
	| 'widget-start'
	| 'widget-change'
	| 'widget-commit'
	| 'widget-cancel'

export type InteractionEventType = CanvasEventType | WidgetEventType

export const MODEL_INTERACTION_TARGET = 'model'
export const STRETCH_AXIS_INTERACTION_TARGET = 'stretch-axis'
export const STRETCH_BOUNDARY_INTERACTION_TARGET = 'stretch-boundary'
export const PIVOT_INTERACTION_TARGET = 'pivot'
export const PIVOT_ANCHOR_INTERACTION_TARGET = 'pivot-anchor'

export class StretchBoundaryTarget {
	public constructor(
		public readonly axis: ModelGeometryAxis,
		public readonly boxIndex: number,
		public readonly boundary: StretchBoundary
	) {}
}

export class InteractionEventModifiers {
	public constructor(
		public readonly alt: boolean,
		public readonly control: boolean,
		public readonly meta: boolean,
		public readonly shift: boolean
	) {}
}

export class InteractionTarget {
	public constructor(
		public readonly id: string,
		public readonly type: string,
		public readonly data: unknown = null
	) {}
}

export class InteractionHit {
	public constructor(
		public readonly target: InteractionTarget,
		public readonly distance: number,
		public readonly worldX: number,
		public readonly worldY: number,
		public readonly worldZ: number
	) {}
}

export class InteractionContext {
	public constructor(
		public readonly modelId: string,
		public readonly hit: InteractionHit | null,
		public readonly target: InteractionTarget | null = hit?.target ?? null
	) {}
}

export class ModelInteractionEvent {
	public constructor(
		public readonly type: InteractionEventType,
		public readonly x: number,
		public readonly y: number,
		public readonly dx: number,
		public readonly dy: number,
		public readonly modifiers: InteractionEventModifiers,
		public readonly context: InteractionContext,
		public readonly raw: Event
	) {}
}

export class WidgetInteraction {
	public constructor(
		public readonly type: WidgetEventType,
		public readonly target: InteractionTarget,
		public readonly x: number,
		public readonly y: number,
		public readonly raw: Event
	) {}
}

export interface InteractionHitTester {
	hitTest(x: number, y: number): InteractionHit | null
}
