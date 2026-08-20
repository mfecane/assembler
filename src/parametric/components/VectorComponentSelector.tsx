import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from '@/components/ui/popover'
import type { VectorComponentSelectorBinding } from '@/parametric/hooks/useFlowGraph'

const components = ['x', 'y', 'z'] as const

export function VectorComponentSelector({
	position,
	select,
	cancel,
}: VectorComponentSelectorBinding) {
	return (
		<Popover open onOpenChange={(open) => { if (!open) cancel() }}>
			<PopoverAnchor asChild>
				<span
					aria-hidden="true"
					className="pointer-events-none fixed size-px"
					style={{ left: position.x, top: position.y }}
				/>
			</PopoverAnchor>
			<PopoverContent
				data-id="vector-component-selector"
				className="w-auto p-1"
				side="top"
				sideOffset={8}
			>
				<ButtonGroup data-id="vector-component-options">
					{components.map((component) => (
						<Button
							key={component}
							type="button"
							variant="outline"
							size="icon"
							className="size-7 text-xs"
							aria-label={`Use ${component.toUpperCase()} component`}
							onClick={() => select(component)}
						>
							{component}
						</Button>
					))}
				</ButtonGroup>
			</PopoverContent>
		</Popover>
	)
}
