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
	rootGraphId?: string
	root: boolean
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
	const { document, activeGraphId, activeRootGraphId, revision } = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot
	)
	const activeGraph = document.requireGraph(activeGraphId)
	const [open, setOpen] = useState(false)
	const { roots, unused } = useMemo(
		() => createGraphTree(document),
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
					<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Root assemblies
					</div>
					{roots.map((item) => (
						<TreeRow
							key={item.key}
							item={item}
							depth={0}
							activeGraphId={activeGraphId}
							activeRootGraphId={activeRootGraphId}
							onOpen={openGraph}
						/>
					))}
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
									activeRootGraphId={activeRootGraphId}
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
	activeRootGraphId,
	onOpen,
}: {
	item: GraphTreeItem
	depth: number
	activeGraphId: string
	activeRootGraphId: string
	onOpen: (graphId: string, rootGraphId?: string) => void
}) {
	const active = item.graphId === activeGraphId
		&& (!item.rootGraphId || item.rootGraphId === activeRootGraphId)
	return (
		<div data-id={`graph-tree-branch-${item.key}`}>
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
				onClick={() => onOpen(item.graphId, item.rootGraphId)}
				title={item.label}
			>
				{depth > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
				{item.root ? <FileBox className="h-3.5 w-3.5" /> : <Network className="h-3.5 w-3.5" />}
				<span className="truncate">{item.label}</span>
			</Button>
			{item.children.map((child) => (
				<TreeRow
					key={child.key}
					item={child}
					depth={depth + 1}
					activeGraphId={activeGraphId}
					activeRootGraphId={activeRootGraphId}
					onOpen={onOpen}
				/>
			))}
		</div>
	)
}

function createGraphTree(document: EditorControllerSnapshot['document']): {
	roots: GraphTreeItem[]
	unused: GraphTreeItem[]
} {
	const includedByRoots = new Set<string>()
	const build = (
		graphId: string,
		key: string,
		rootGraphId: string | undefined,
		path: ReadonlySet<string>,
		root: boolean
	): GraphTreeItem => {
		if (path.has(graphId)) {
			throw new Error(
				`Assembly selector found recursive graph reference at "${graphId}" in path ` +
					JSON.stringify([...path])
			)
		}
		const graph = document.requireGraph(graphId)
		if (rootGraphId) includedByRoots.add(graphId)
		const nextPath = new Set(path).add(graphId)
		const children = graph.model.getNodes()
			.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
			.flatMap((node) => {
				const childId = node.getGraphId()
				if (!document.getGraph(childId)) return []
				return [build(childId, `${key}/${node.id}`, rootGraphId, nextPath, false)]
			})
		return { key, graphId, rootGraphId, root, label: graph.label, children }
	}

	const roots = document.getRootGraphs().map((root) => {
		const graphId = root.getGraphId()
		return build(graphId, `root/${graphId}`, graphId, new Set(), true)
	})
	const remaining = document.getGraphs().filter((graph) => !includedByRoots.has(graph.id))
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
		.map((graph) => build(graph.id, `unused/${graph.id}`, undefined, new Set(), false))
	return { roots, unused }
}
