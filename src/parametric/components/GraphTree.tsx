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
import type {
	EditorController,
	EditorControllerSnapshot,
} from '@/parametric/editor/EditorController'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'

interface GraphTreeItem {
	key: string
	graphId: string
	label: string
	children: GraphTreeItem[]
}

export function GraphTree({
	controller,
	disabled = false,
}: {
	controller: EditorController
	disabled?: boolean
}) {
	const { document, activeGraphId, revision } = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot
	)
	const activeGraph = document.requireGraph(activeGraphId)
	const [open, setOpen] = useState(false)
	const { root, unused } = useMemo(
		() => createGraphTree(document),
		[document, revision]
	)
	const openGraph = (graphId: string) => {
		controller.openGraph(graphId)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								data-id="graph-tree-trigger"
								type="button"
								variant="outline"
								size="sm"
								className="min-w-0 max-w-64 justify-start gap-2 bg-muted/40 px-3 shadow-none"
								disabled={disabled}
								aria-label="Select assembly"
								aria-haspopup="tree"
							>
								<Network className="text-muted-foreground" />
								<span className="min-w-0 flex-1 truncate text-left">{activeGraph.label}</span>
								<ChevronDown className="ml-auto text-muted-foreground" />
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom">Select an assembly</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PopoverContent
				data-id="graph-tree-popover"
				align="start"
				className="max-h-[min(32rem,70vh)] w-72 overflow-auto p-2"
			>
				<div data-id="graph-tree" role="tree" aria-label="Project assemblies">
					<TreeRow
						item={root}
						depth={0}
						activeGraphId={activeGraphId}
						onOpen={openGraph}
						entry
					/>
					{unused.length > 0 && (
						<div className="mt-3 border-t border-border pt-3">
							<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
								Unused assemblies
							</div>
							{unused.map((item) => (
								<TreeRow
									key={item.key}
									item={item}
									depth={0}
									activeGraphId={activeGraphId}
									onOpen={openGraph}
								/>
							))}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}

function TreeRow({
	item,
	depth,
	activeGraphId,
	onOpen,
	entry = false,
}: {
	item: GraphTreeItem
	depth: number
	activeGraphId: string
	onOpen: (graphId: string) => void
	entry?: boolean
}) {
	const active = item.graphId === activeGraphId
	return (
		<div>
			<Button
				data-id={`graph-tree-item-${item.key}`}
				type="button"
				variant="ghost"
				role="treeitem"
				aria-current={active ? 'page' : undefined}
				className={`h-8 w-full justify-start gap-1.5 px-2 text-xs ${
					active ? 'bg-input text-primary' : 'text-muted-foreground'
				}`}
				style={{ paddingLeft: 8 + depth * 14 }}
				onClick={() => onOpen(item.graphId)}
				title={item.label}
			>
				{depth > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
				{entry ? <FileBox className="h-3.5 w-3.5" /> : <Network className="h-3.5 w-3.5" />}
				<span className="truncate">{item.label}</span>
			</Button>
			{item.children.map((child) => (
				<TreeRow
					key={child.key}
					item={child}
					depth={depth + 1}
					activeGraphId={activeGraphId}
					onOpen={onOpen}
				/>
			))}
		</div>
	)
}

function createGraphTree(document: EditorControllerSnapshot['document']): {
	root: GraphTreeItem
	unused: GraphTreeItem[]
} {
	const included = new Set<string>()
	const build = (graphId: string, entry = false): GraphTreeItem | null => {
		if (included.has(graphId)) return null
		const graph = document.requireGraph(graphId)
		included.add(graphId)
		const children = graph.model.getNodes()
			.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
			.flatMap((node) => {
				const childId = node.getGraphId()
				if (!document.getGraph(childId)) return []
				const item = build(childId)
				return item ? [item] : []
			})
		return { key: entry ? `entry/${graphId}` : graphId, graphId, label: graph.label, children }
	}

	const entryId = document.getEntryGraphId()
	const root = build(entryId, true)
	if (!root) throw new Error(`Entry assembly "${entryId}" was already added to its own selector tree`)
	const remaining = document.getGraphs().filter((graph) => !included.has(graph.id))
	const remainingIds = new Set(remaining.map((graph) => graph.id))
	const referencedByRemaining = new Set(
		remaining.flatMap((graph) =>
			graph.model.getNodes()
				.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
				.map((node) => node.getGraphId())
				.filter((graphId) => remainingIds.has(graphId))
		)
	)
	const unused = remaining
		.filter((graph) => !referencedByRemaining.has(graph.id))
		.flatMap((graph) => {
			const item = build(graph.id)
			return item ? [item] : []
		})
	remaining.forEach((graph) => {
		const item = build(graph.id)
		if (item) unused.push(item)
	})
	return { root, unused }
}
