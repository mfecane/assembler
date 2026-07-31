import { Mesh, PerspectiveCamera, Raycaster, Vector2 } from 'three'
import type { SceneAssetInstanceMetadata } from '@/parametric/evaluation/SceneMetadata'
import type { ViewportEditorController } from '@/parametric/three/editor/ViewportEditorController'

export type CanvasEventType = 'click'

export interface InteractionContext {
	mesh: Mesh | null
}

export interface InteractionEvent {
	type: CanvasEventType
	x: number
	y: number
	dx: number
	dy: number
	modifiers: {
		alt: boolean
		control: boolean
		meta: boolean
		shift: boolean
	}
	context: InteractionContext
	raw: PointerEvent
}

export class InteractionHandlerResult {
	public capture = false
	public releaseCapture = false
	public pass = true

	public setHandled(): this {
		this.pass = false
		return this
	}

	public setCapture(): this {
		this.capture = true
		this.pass = false
		return this
	}

	public setReleaseCapture(): this {
		this.releaseCapture = true
		return this
	}

	public setPass(): this {
		this.pass = true
		return this
	}
}

export interface InteractionHandler {
	id: string
	priority: number
	enabled: boolean
	isEnabled(event: InteractionEvent): boolean
	onEvent(event: InteractionEvent): Promise<InteractionHandlerResult>
}

export class InteractionHandlerRouter {
	private readonly handlers: InteractionHandler[] = []

	public add(handler: InteractionHandler): void {
		this.handlers.push(handler)
		this.handlers.sort((left, right) => right.priority - left.priority)
	}

	public async dispatch(event: InteractionEvent): Promise<void> {
		for (const handler of this.handlers) {
			if (!handler.enabled || !handler.isEnabled(event)) continue
			if (!(await handler.onEvent(event)).pass) return
		}
	}
}

export class MeshSelectionInteractionHandler implements InteractionHandler {
	public readonly id = 'mesh-selection'
	public readonly priority = 100
	public enabled = true

	public constructor(private readonly controller: ViewportEditorController) {}

	public isEnabled(): boolean {
		return !this.controller.isTransformModeActive()
	}

	public async onEvent(event: InteractionEvent): Promise<InteractionHandlerResult> {
		const sceneInstance = event.context.mesh?.userData.sceneInstance as
			| SceneAssetInstanceMetadata
			| undefined
		if (
			event.context.mesh
			&& sceneInstance?.assetKind === 'catalog'
			&& typeof sceneInstance.instanceId === 'string'
			&& typeof sceneInstance.originNode?.graphId === 'string'
			&& typeof sceneInstance.originNode.nodeId === 'string'
			&& typeof sceneInstance.originNode.nodeInstanceId === 'string'
		) {
			this.controller.selectMesh(
				sceneInstance.instanceId,
				sceneInstance.originNode,
				event.x,
				event.y
			)
		} else {
			this.controller.clearMeshSelection()
		}
		return new InteractionHandlerResult().setHandled()
	}
}

export class CanvasEventHandler {
	private readonly raycaster = new Raycaster()
	private readonly pointer = new Vector2()
	private pointerStart: { x: number; y: number } | null = null

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly camera: PerspectiveCamera,
		private readonly getMeshes: () => Mesh[],
		private readonly router: InteractionHandlerRouter,
		private readonly interactionBlocked: () => boolean
	) {
		canvas.addEventListener('pointerdown', this.onPointerDown)
		canvas.addEventListener('pointerup', this.onPointerUp)
		canvas.addEventListener('contextmenu', this.onContextMenu)
	}

	public dispose(): void {
		this.canvas.removeEventListener('pointerdown', this.onPointerDown)
		this.canvas.removeEventListener('pointerup', this.onPointerUp)
		this.canvas.removeEventListener('contextmenu', this.onContextMenu)
	}

	private readonly onPointerDown = (event: PointerEvent) => {
		this.pointerStart = { x: event.clientX, y: event.clientY }
	}

	private readonly onPointerUp = (event: PointerEvent) => {
		const start = this.pointerStart
		this.pointerStart = null
		if (!start || this.interactionBlocked()) return
		const dx = event.clientX - start.x
		const dy = event.clientY - start.y
		if (Math.hypot(dx, dy) > 4) return

		const bounds = this.canvas.getBoundingClientRect()
		this.pointer.set(
			((event.clientX - bounds.left) / bounds.width) * 2 - 1,
			-((event.clientY - bounds.top) / bounds.height) * 2 + 1
		)
		this.raycaster.setFromCamera(this.pointer, this.camera)
		const mesh = this.raycaster.intersectObjects(this.getMeshes(), false)[0]?.object

		void this.router.dispatch({
			type: 'click',
			x: event.clientX - bounds.left,
			y: event.clientY - bounds.top,
			dx,
			dy,
			modifiers: {
				alt: event.altKey,
				control: event.ctrlKey,
				meta: event.metaKey,
				shift: event.shiftKey,
			},
			context: { mesh: mesh instanceof Mesh ? mesh : null },
			raw: event,
		})
	}

	private readonly onContextMenu = (event: MouseEvent) => {
		event.preventDefault()
	}
}
