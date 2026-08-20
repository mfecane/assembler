import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { MeshAssetPickerDialog } from '@/parametric/components/MeshAssetPickerDialog'
import { useEditorController } from '@/parametric/editor/react/EditorContext'

export function AssetHelperDialog() {
	const [open, setOpen] = useState(false)
	const controller = useEditorController()
	const { getNodes, screenToFlowPosition } = useReactFlow()

	const addAsset = (meshId: string) => {
		const cascadeOffset = (getNodes().length % 8) * 18
		const position = screenToFlowPosition({
			x: window.innerWidth / 4 + cascadeOffset,
			y: window.innerHeight / 2 + cascadeOffset,
		})
		controller.addMeshAsset(meshId, position)
	}

	const addStretchableAsset = (meshId: string) => {
		const cascadeOffset = (getNodes().length % 8) * 18
		const position = screenToFlowPosition({
			x: window.innerWidth / 4 + cascadeOffset,
			y: window.innerHeight / 2 + cascadeOffset,
		})
		controller.addStretchableAsset(meshId, position)
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

			<MeshAssetPickerDialog
				open={open}
				onOpenChange={setOpen}
				onSelect={addAsset}
				showInstanceActions
				onAddStretchableInstance={addStretchableAsset}
				description="Select a registered mesh asset to add it to the current assembly."
			/>
		</>
	)
}
