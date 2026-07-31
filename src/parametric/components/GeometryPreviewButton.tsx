import { Box, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useGraphPreview } from '@/parametric/editor/react/EditorContext'

export function GeometryPreviewButton({
	nodeId,
	className,
}: {
	nodeId: string
	className?: string
}) {
	const { nodeId: previewNodeId, previewNode, showGraphOutput } = useGraphPreview()
	const active = previewNodeId === nodeId

	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						data-id={`open-node-in-three-editor-${nodeId}`}
						type="button"
						variant={active ? 'secondary' : 'ghost'}
						size="icon"
						className={cn(
							'nodrag nopan h-6 w-6 text-muted-foreground',
							className
						)}
						aria-label={active ? 'Show assembly output' : 'Open node output in 3D editor'}
						onClick={() => active ? showGraphOutput() : previewNode(nodeId)}
					>
						{active ? <EyeOff /> : <Box />}
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					{active ? 'Back to assembly output' : 'Open in 3D editor'}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
