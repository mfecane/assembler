import { useState, type FormEvent } from 'react'
import { type Edge, useReactFlow } from '@xyflow/react'
import {
	Circle,
	Copy,
	Hash,
	ListFilter,
	ListPlus,
	Move3d,
	Network,
	Palette,
	PaintBucket,
	Plus,
	Search,
	Shapes,
	ToggleLeft,
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useGraphActions } from '@/parametric/hooks/useGraphActions'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { useNodeSelectorShortcut } from '@/parametric/hooks/useNodeSelectorShortcut'
import type { GraphInputDefinition } from '@/parametric/model/GraphDocumentModel'
import {
	type NodeMenuGroup,
	nodeViewPresentation,
} from '@/parametric/nodes/nodeViewRegistry'

const groupOrder: NodeMenuGroup[] = ['Inputs', 'Geometry', 'Appearance', 'Operations', 'Other']

const graphInputOptions: Array<{
	valueType: GraphInputDefinition['valueType']
	label: string
	description: string
	icon: LucideIcon
}> = [
	{ valueType: 'number', label: 'Number', description: 'Add a numeric value', icon: Hash },
	{
		valueType: 'numberArray',
		label: 'Number array',
		description: 'Add a numeric list value',
		icon: ListPlus,
	},
	{ valueType: 'vector3', label: 'Vector 3', description: 'Add an XYZ vector value', icon: Move3d },
	{ valueType: 'enum', label: 'Choice', description: 'Add a choice value', icon: ListFilter },
	{
		valueType: 'materialInstance',
		label: 'Material',
		description: 'Add a material value',
		icon: PaintBucket,
	},
	{ valueType: 'color', label: 'Color', description: 'Add a palette color value', icon: Palette },
	{ valueType: 'boolean', label: 'Boolean', description: 'Add a toggle value', icon: ToggleLeft },
	{ valueType: 'geometry', label: 'Geometry', description: 'Add an exportable geometry input', icon: Shapes },
]

interface NodeSelectionOption {
	id: string
	group: string
	label: string
	description: string
	icon: LucideIcon
	select: () => void
}

export function NodeSelector({ selectedEdges }: { selectedEdges: Edge[] }) {
	const [open, setOpen] = useState(false)
	const [filter, setFilter] = useState('')
	const {
		addNode,
		addGraphInput,
		addInputReference,
		addGraphInstance,
		graphDefinitions,
		nodeDefinitions,
	} = useGraphActions()
	const { document, activeGraphId } = useGraphSnapshot()
	const documentGraphInputs = document.requireGraph(activeGraphId).inputs
	const { getNodes, screenToFlowPosition } = useReactFlow()
	useNodeSelectorShortcut(setOpen)

	const getSelectedEdgeId = () =>
		selectedEdges.length === 1 ? selectedEdges[0].id : undefined

	const getInsertPosition = () => {
		const cascadeOffset = (getNodes().length % 8) * 18
		return screenToFlowPosition({
			x: window.innerWidth / 4 + cascadeOffset,
			y: window.innerHeight / 2 + cascadeOffset,
		})
	}

	const close = () => {
		setOpen(false)
		setFilter('')
	}

	const options: NodeSelectionOption[] = [
		...graphInputOptions.map((option) => ({
			id: `input:${option.valueType}`,
			group: 'Inputs',
			label: option.label,
			description: option.description,
			icon: option.icon,
			select: () => {
				addGraphInput(option.valueType, getInsertPosition())
				close()
			},
		})),
		...(documentGraphInputs.length > 0 ? [{
			id: 'input-reference',
			group: 'Inputs',
			label: 'Input Reference',
			description: 'Use an existing graph input',
			icon: Copy,
			select: () => {
				addInputReference(documentGraphInputs[0].id, getInsertPosition())
				close()
			},
		}] : []),
		...graphDefinitions.map((graph) => ({
			id: `graph:${graph.id}`,
			group: 'Assemblies in this project',
			label: graph.label,
			description: 'Add an instance of this assembly',
			icon: Network,
			select: () => {
				addGraphInstance(graph.id, getInsertPosition(), getSelectedEdgeId())
				close()
			},
		})),
		...groupOrder.flatMap((group) => nodeDefinitions
			.filter((definition) => (nodeViewPresentation[definition.type]?.group ?? 'Other') === group)
			.map((definition) => {
				const presentation = nodeViewPresentation[definition.type]
				return {
					id: `node:${definition.type}`,
					group,
					label: definition.label,
					description: presentation?.description ?? 'Add node',
					icon: presentation?.icon ?? Circle,
					select: () => {
						addNode(definition.type, getInsertPosition(), getSelectedEdgeId())
						close()
					},
				}
			})),
	]
	const normalizedFilter = filter.trim().toLocaleLowerCase()
	const filteredOptions = normalizedFilter
		? options.filter((option) => (
			`${option.label} ${option.description} ${option.group}`
				.toLocaleLowerCase()
				.includes(normalizedFilter)
		))
		: options

	const submitFirstResult = (event: FormEvent) => {
		event.preventDefault()
		filteredOptions[0]?.select()
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						data-id="add-node-trigger"
						type="button"
						variant="ghost"
						size="icon"
						className="nodrag nopan h-8 w-8"
						aria-label="Add node"
						aria-keyshortcuts="Space"
						onClick={() => setOpen(true)}
					>
						<Plus />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">Add node (Space)</TooltipContent>
			</Tooltip>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen)
					if (!nextOpen) setFilter('')
				}}
			>
				<DialogContent
					data-id="node-selection-dialog"
					className="gap-0 p-0 sm:max-w-xl"
				>
					<DialogHeader className="px-6 pb-4 pt-6">
						<DialogTitle>Add node</DialogTitle>
						<DialogDescription>
							Filter the available nodes, then press Enter to add the first result.
						</DialogDescription>
					</DialogHeader>
					<form data-id="node-selection-form" onSubmit={submitFirstResult}>
						<div className="relative border-y border-border px-6 py-3">
							<Search
								className="pointer-events-none absolute left-9 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								data-id="node-filter-input"
								value={filter}
								onChange={(event) => setFilter(event.target.value)}
								placeholder="Filter nodes..."
								aria-label="Filter nodes"
								className="pl-9"
								autoFocus
							/>
						</div>
						<div
							data-id="node-selection-results"
							className="max-h-[min(60vh,32rem)] overflow-y-auto p-2"
						>
							{filteredOptions.length === 0 ? (
								<p className="px-3 py-8 text-center text-sm text-muted-foreground">
									No nodes match “{filter}”.
								</p>
							) : (
								groupOptions(filteredOptions).map(([group, groupOptions], groupIndex) => (
									<section
										key={group}
										data-id="node-selection-group"
										className={cn(groupIndex > 0 && 'mt-2 border-t border-border pt-2')}
									>
										<h3 className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
											{group}
										</h3>
										<div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
											{groupOptions.map((option, optionIndex) => (
												<NodeOptionButton
													key={option.id}
													option={option}
													first={groupIndex === 0 && optionIndex === 0}
												/>
											))}
										</div>
									</section>
								))
							)}
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	)
}

function groupOptions(options: NodeSelectionOption[]): Array<[string, NodeSelectionOption[]]> {
	const groups = new Map<string, NodeSelectionOption[]>()
	for (const option of options) {
		const group = groups.get(option.group)
		if (group) group.push(option)
		else groups.set(option.group, [option])
	}
	return [...groups.entries()]
}

function NodeOptionButton({
	option,
	first,
}: {
	option: NodeSelectionOption
	first: boolean
}) {
	const Icon = option.icon
	return (
		<Button
			data-id="node-selection-option"
			data-first-result={first || undefined}
			type="button"
			variant="ghost"
			className="h-auto min-w-0 justify-start gap-3 px-2 py-2 text-left"
			onClick={option.select}
		>
			<span
				className={cn(
					'flex size-8 shrink-0 items-center justify-center rounded-md',
					'border border-border bg-input text-primary'
				)}
			>
				<Icon />
			</span>
			<span className="flex min-w-0 flex-col items-start">
				<span className="text-xs font-semibold text-foreground">{option.label}</span>
				<span className="text-[11px] font-normal text-muted-foreground">{option.description}</span>
			</span>
		</Button>
	)
}
