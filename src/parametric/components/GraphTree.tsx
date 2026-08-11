import { useMemo, useState, useSyncExternalStore } from 'react'
import { ChevronDown, ChevronRight, FileBox, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { EditorController } from '@/parametric/editor/EditorController'
import {
	buildGraphDependencyForest,
	type GraphDependencyTreeItem,
} from '@/parametric/components/buildGraphDependencyForest'

export function GraphTree({
	controller,
	disabled = false,
}: {
	controller: EditorController
	disabled?: boolean
}) {
	const { document, activeGraphId, activeRootGraphId, revision } = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot
	)
	const activeGraph = document.requireGraph(activeGraphId)
	const [open, setOpen] = useState(false)
	const { rootTrees, unusedTrees } = useMemo(
		() => buildGraphDependencyForest(document),
		[document, revision]
	)
	const openGraph = (graphId: string, rootGraphId?: string) => {
		controller.openGraph(graphId, rootGraphId)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								data-id="graph-selector-trigger"
								type="button"
								variant="outline"
								size="sm"
								className="min-w-0 max-w-64 justify-start gap-2 bg-muted/40 px-3 shadow-none"
								disabled={disabled}
								aria-label="Select graph"
								aria-haspopup="listbox"
							>
								<Network className="text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate text-left">{activeGraph.label}</span>
								<ChevronDown className="ml-auto text-muted-foreground" />
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom">Select a graph</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PopoverContent
				data-id="graph-selector-popover"
				align="start"
				className="max-h-[min(32rem,70vh)] w-72 overflow-auto p-2"
			>
				<div data-id="graph-selector" role="listbox" aria-label="Project graphs">
					<GraphTreeGroup
						label="Root graphs"
						trees={rootTrees}
						activeGraphId={activeGraphId}
						activeRootGraphId={activeRootGraphId}
						rootContext
						onOpen={openGraph}
					/>
					{unusedTrees.length > 0 && (
						<div className="mt-3 border-t border-border pt-3">
							<GraphTreeGroup
								label="Unused graphs"
								trees={unusedTrees}
								activeGraphId={activeGraphId}
								activeRootGraphId={activeRootGraphId}
								onOpen={openGraph}
							/>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}

function GraphTreeGroup({
	label,
	trees,
	activeGraphId,
	activeRootGraphId,
	rootContext = false,
	onOpen,
}: {
	label: string
	trees: GraphDependencyTreeItem[]
	activeGraphId: string
	activeRootGraphId: string
	rootContext?: boolean
	onOpen: (graphId: string, rootGraphId?: string) => void
}) {
	return (
		<div data-id={`graph-selector-group-${rootContext ? 'root' : 'unused'}`}>
			<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</div>
			{trees.map((tree) => (
				<GraphTreeBranch
					key={tree.graph.id}
					tree={tree}
					activeGraphId={activeGraphId}
					activeRootGraphId={activeRootGraphId}
					rootGraphId={rootContext ? tree.graph.id : undefined}
					onOpen={onOpen}
				/>
			))}
		</div>
	)
}

function GraphTreeBranch({
	tree,
	activeGraphId,
	activeRootGraphId,
	rootGraphId,
	depth = 0,
	onOpen,
}: {
	tree: GraphDependencyTreeItem
	activeGraphId: string
	activeRootGraphId: string
	rootGraphId?: string
	depth?: number
	onOpen: (graphId: string, rootGraphId?: string) => void
}) {
	const active = tree.graph.id === activeGraphId
		&& (!rootGraphId || rootGraphId === activeRootGraphId)

	return (
		<div data-id={`graph-selector-branch-${tree.graph.id}`}>
			<Button
				data-id={`graph-selector-item-${tree.graph.id}`}
				data-depth={depth}
				type="button"
				variant="ghost"
				role="option"
				aria-selected={active}
				className={cn(
					'h-8 w-full justify-start gap-1.5 px-2 text-xs',
					active ? 'bg-input text-primary' : 'text-muted-foreground'
				)}
				style={{ paddingLeft: `${depth * 14 + 8}px` }}
				onClick={() => onOpen(tree.graph.id, rootGraphId)}
				title={tree.graph.label}
			>
				{depth > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
				{tree.root
					? <FileBox className="h-3.5 w-3.5 shrink-0" />
					: <Network className="h-3.5 w-3.5 shrink-0" />}
				<span className="truncate">{tree.graph.label}</span>
			</Button>
			{tree.children.map((child) => (
				<GraphTreeBranch
					key={child.graph.id}
					tree={child}
					activeGraphId={activeGraphId}
					activeRootGraphId={activeRootGraphId}
					rootGraphId={rootGraphId}
					depth={depth + 1}
					onOpen={onOpen}
				/>
			))}
		</div>
	)
}
