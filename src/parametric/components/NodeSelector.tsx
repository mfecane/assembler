import { useState } from 'react'
import { type Edge, useReactFlow } from '@xyflow/react'
import { ChevronDown, Circle, Hash, ListFilter, Network, Palette, Plus, Shapes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { useGraphActions } from '@/parametric/hooks/useGraphActions'
import {
	type NodeMenuGroup,
	nodeViewPresentation,
} from '@/parametric/nodes/nodeViewRegistry'

const groupOrder: NodeMenuGroup[] = ['Inputs', 'Geometry', 'Appearance', 'Operations', 'Other']

export function NodeSelector({ selectedEdges }: { selectedEdges: Edge[] }) {
	const {
		addNode,
		addGraphInput,
		addGraphInstance,
		graphDefinitions,
		nodeDefinitions,
	} = useGraphActions()
	const { getNodes, screenToFlowPosition } = useReactFlow()
	const [open, setOpen] = useState(false)

	const addSelectedNode = (type: string) => {
		const position = getInsertPosition()
		addNode(type, position, getSelectedEdgeId())
		setOpen(false)
	}

	const addSelectedGraph = (graphId: string) => {
		const position = getInsertPosition()
		addGraphInstance(graphId, position, getSelectedEdgeId())
		setOpen(false)
	}

	const getSelectedEdgeId = () =>
		selectedEdges.length === 1 ? selectedEdges[0].id : undefined

	const addSelectedInput = (valueType: 'number' | 'enum' | 'color' | 'geometry') => {
		addGraphInput(valueType, getInsertPosition())
		setOpen(false)
	}

	const getInsertPosition = () => {
		const cascadeOffset = (getNodes().length % 8) * 18
		return screenToFlowPosition({
			x: window.innerWidth / 4 + cascadeOffset,
			y: window.innerHeight / 2 + cascadeOffset,
		})
	}

	return (
		<Tooltip>
			<Popover open={open} onOpenChange={setOpen}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button
							data-id="add-node-trigger"
							type="button"
							variant="ghost"
							size="icon"
							className="nodrag nopan relative h-8 w-8"
							aria-label="Add node"
						>
							<Plus />
							<ChevronDown
								className="absolute bottom-0.5 right-0.5 !size-2.5 text-muted-foreground"
								aria-hidden="true"
							/>
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<PopoverContent
					data-id="add-node-menu"
					align="start"
					collisionPadding={8}
					className={cn(
						'nodrag nopan w-72 max-w-[var(--radix-popover-content-available-width)] p-2',
						'max-h-[var(--radix-popover-content-available-height)] overflow-y-auto'
					)}
				>
					<div className="mb-2 border-b border-border pb-2" data-id="graph-input-node-options">
						<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Assembly inputs
						</div>
						<div className="grid grid-cols-2 gap-1">
							<InputNodeButton icon={Hash} label="Number" onClick={() => addSelectedInput('number')} />
							<InputNodeButton icon={ListFilter} label="Enum" onClick={() => addSelectedInput('enum')} />
							<InputNodeButton icon={Palette} label="Color" onClick={() => addSelectedInput('color')} />
							<InputNodeButton icon={Shapes} label="Geometry" onClick={() => addSelectedInput('geometry')} />
						</div>
					</div>
					{graphDefinitions.length > 0 && (
						<div className="mb-2 border-b border-border pb-2">
							<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								Assemblies in this project
							</div>
							<div className="flex flex-col gap-0.5">
								{graphDefinitions.map((graph) => (
									<Button
										key={graph.id}
										type="button"
										variant="ghost"
										className="h-auto w-full justify-start gap-3 px-2 py-2 text-left"
										onClick={() => addSelectedGraph(graph.id)}
									>
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-input text-primary">
											<Network />
										</span>
										<span className="text-xs font-semibold text-foreground">{graph.label}</span>
									</Button>
								))}
							</div>
						</div>
					)}
					{groupOrder.map((group, groupIndex) => {
						const definitions = nodeDefinitions.filter(
							(definition) => (nodeViewPresentation[definition.type]?.group ?? 'Other') === group
						)
						if (definitions.length === 0) return null

						return (
							<div
								key={group}
								className={groupIndex === 0 ? '' : 'mt-2 border-t border-border pt-2'}
							>
								<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									{group}
								</div>
								<div className="flex flex-col gap-0.5">
									{definitions.map((definition) => {
										const presentation = nodeViewPresentation[definition.type]
										const Icon = presentation?.icon ?? Circle

										return (
											<Button
												key={definition.type}
												type="button"
												variant="ghost"
												className="h-auto w-full justify-start gap-3 px-2 py-2 text-left"
												onClick={() => addSelectedNode(definition.type)}
											>
												<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-input text-primary">
													<Icon />
												</span>
												<span className="flex min-w-0 flex-col items-start">
													<span className="text-xs font-semibold text-foreground">
														{definition.label}
													</span>
													<span className="text-[11px] font-normal text-muted-foreground">
														{presentation?.description ?? 'Add node'}
													</span>
												</span>
											</Button>
										)
									})}
								</div>
							</div>
						)
					})}
				</PopoverContent>
			</Popover>
			<TooltipContent side="top">Add node</TooltipContent>
		</Tooltip>
	)
}

function InputNodeButton({
	icon: Icon,
	label,
	onClick,
}: {
	icon: typeof Hash
	label: string
	onClick: () => void
}) {
	return (
		<Button
			data-id={`add-${label.toLowerCase()}-graph-input`}
			type="button"
			variant="ghost"
			className="h-9 justify-start gap-2 px-2 text-xs"
			onClick={onClick}
		>
			<Icon className="text-primary" />
			{label}
		</Button>
	)
}
