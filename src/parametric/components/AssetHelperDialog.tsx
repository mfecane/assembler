import { useEffect, useMemo, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { PackageSearch } from 'lucide-react'
import {
	AmbientLight,
	Color,
	DirectionalLight,
	HemisphereLight,
	Mesh,
	MeshStandardMaterial,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGraphController } from '@/parametric/controller/GraphEditorContext'
import type { MeshDescriptor } from '@/parametric/model/MeshCatalog'

type PreviewResult =
	| { status: 'ready'; source: string }
	| { status: 'error'; message: string }

export function AssetHelperDialog() {
	const [open, setOpen] = useState(false)
	const controller = useGraphController()
	const { getNodes, screenToFlowPosition } = useReactFlow()
	const assets = useMemo(() => controller.getSelectableMeshes(), [controller])
	const previews = useAssetPreviews(open, assets)

	const addAsset = (meshId: string) => {
		const cascadeOffset = (getNodes().length % 8) * 18
		const position = screenToFlowPosition({
			x: window.innerWidth / 4 + cascadeOffset,
			y: window.innerHeight / 2 + cascadeOffset,
		})
		controller.addMeshAsset(meshId, position)
		setOpen(false)
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						data-id="open-asset-helper"
						type="button"
						variant="ghost"
						size="icon"
						className="nodrag nopan h-8 w-8"
						aria-label="Browse mesh assets"
						onClick={() => setOpen(true)}
					>
						<PackageSearch />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">Browse mesh assets</TooltipContent>
			</Tooltip>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					data-id="asset-helper-dialog"
					className="flex max-h-[85vh] max-w-3xl flex-col gap-0 p-0"
				>
					<DialogHeader className="border-b border-border px-6 py-5">
						<DialogTitle>Mesh assets</DialogTitle>
						<DialogDescription>
							Select one of {assets.length} registered assets to add it to the current assembly.
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<div
							data-id="asset-helper-grid"
							className="grid grid-cols-2 gap-3"
						>
							{assets.map((asset) => (
								<AssetCard
									key={asset.id}
									asset={asset}
									preview={previews.get(asset.id)}
									onSelect={() => addAsset(asset.id)}
								/>
							))}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}

function AssetCard({
	asset,
	preview,
	onSelect,
}: {
	asset: MeshDescriptor
	preview: PreviewResult | undefined
	onSelect: () => void
}) {
	return (
		<Button
			data-id={`asset-helper-item-${asset.id}`}
			data-asset-id={asset.id}
			type="button"
			variant="outline"
			className="h-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden p-0 text-left"
			onClick={onSelect}
		>
			<div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-background">
				{preview?.status === 'ready' ? (
					<img
						data-id={`asset-helper-preview-${asset.id}`}
						src={preview.source}
						alt={`Rendered preview of ${asset.label}`}
						className="h-full w-full object-cover"
					/>
				) : preview?.status === 'error' ? (
					<div
						data-id={`asset-helper-preview-error-${asset.id}`}
						role="alert"
						className="max-h-full overflow-auto whitespace-pre-wrap break-words p-3 text-[10px] leading-relaxed text-danger"
					>
						{preview.message}
					</div>
				) : (
					<div
						data-id={`asset-helper-preview-loading-${asset.id}`}
						className="text-xs text-muted-foreground"
					>
						Rendering preview…
					</div>
				)}
			</div>
			<div className="w-full border-t border-border px-3 py-2">
				<div className="truncate text-xs font-semibold text-foreground">
					{asset.label}
				</div>
				<div className="mt-0.5 truncate text-[10px] font-normal text-muted-foreground">
					{asset.id}
				</div>
			</div>
		</Button>
	)
}

function useAssetPreviews(
	enabled: boolean,
	assets: readonly MeshDescriptor[]
): ReadonlyMap<string, PreviewResult> {
	const controller = useGraphController()
	const [previews, setPreviews] = useState<ReadonlyMap<string, PreviewResult>>(new Map())

	useEffect(() => {
		if (!enabled || assets.length === 0) return

		let cancelled = false
		let animationFrame = 0
		const canvas = document.createElement('canvas')
		let renderer: WebGLRenderer

		try {
			renderer = new WebGLRenderer({
				canvas,
				antialias: true,
				preserveDrawingBuffer: true,
			})
			renderer.setPixelRatio(1)
			renderer.setSize(480, 270, false)
		} catch (error) {
			const message = formatPreviewError(
				'Could not initialize the shared WebGL renderer for the mesh asset helper',
				error
			)
			console.error(message, error)
			setPreviews(new Map(
				assets.map((asset) => [asset.id, { status: 'error', message }] as const)
			))
			return
		}

		const scene = createPreviewScene()
		const camera = new PerspectiveCamera(35, 16 / 9, 0.01, 1000)
		const material = new MeshStandardMaterial({
			color: 0xeaceac,
			metalness: 0.08,
			roughness: 0.72,
		})
		let index = 0

		const renderNext = () => {
			if (cancelled || index >= assets.length) return
			const asset = assets[index]
			index += 1

			try {
				const geometry = controller.createMeshPreviewGeometry(asset.id)
				if (!geometry) {
					throw new Error(
						`Mesh catalog returned no geometry for registered asset "${asset.id}"`
					)
				}
				geometry.computeBoundingSphere()
				const bounds = geometry.boundingSphere
				if (!bounds || !Number.isFinite(bounds.radius) || bounds.radius <= 0) {
					geometry.dispose()
					throw new Error(
						`Geometry for asset "${asset.id}" has no finite, positive bounding sphere`
					)
				}

				const mesh = new Mesh(geometry, material)
				mesh.position.copy(bounds.center).multiplyScalar(-1)
				scene.add(mesh)

				try {
					const radius = bounds.radius
					const distance = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.1
					camera.near = Math.max(radius / 100, 0.001)
					camera.far = Math.max(distance + radius * 4, 10)
					camera.position.copy(new Vector3(1, 0.75, 1).normalize().multiplyScalar(distance))
					camera.lookAt(0, 0, 0)
					camera.updateProjectionMatrix()
					renderer.render(scene, camera)

					const source = renderer.domElement.toDataURL('image/png')
					setPreviews((current) => new Map(current).set(asset.id, {
						status: 'ready',
						source,
					}))
				} finally {
					scene.remove(mesh)
					geometry.dispose()
				}
			} catch (error) {
				const message = formatPreviewError(
					`Could not render mesh asset preview for "${asset.label}" ` +
						`(asset id "${asset.id}", item ${index} of ${assets.length})`,
					error
				)
				console.error(message, error)
				setPreviews((current) => new Map(current).set(asset.id, {
					status: 'error',
					message,
				}))
			}

			if (!cancelled && index < assets.length) {
				animationFrame = requestAnimationFrame(renderNext)
			}
		}

		animationFrame = requestAnimationFrame(renderNext)

		return () => {
			cancelled = true
			cancelAnimationFrame(animationFrame)
			material.dispose()
			renderer.dispose()
		}
	}, [assets, controller, enabled])

	return previews
}

function createPreviewScene(): Scene {
	const scene = new Scene()
	scene.background = new Color(0x232528)
	scene.add(new AmbientLight(0xffffff, 0.75))
	const hemisphere = new HemisphereLight(0xffffff, 0x30343a, 1.4)
	hemisphere.position.set(0, 4, 0)
	scene.add(hemisphere)
	const keyLight = new DirectionalLight(0xffffff, 2.2)
	keyLight.position.set(4, 6, 5)
	scene.add(keyLight)
	const fillLight = new DirectionalLight(0x9fbfff, 0.8)
	fillLight.position.set(-4, 2, -3)
	scene.add(fillLight)
	return scene
}

function formatPreviewError(context: string, error: unknown): string {
	if (error instanceof Error) {
		return `${context}. ${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`
	}
	return `${context}. Thrown value: ${String(error)}`
}
