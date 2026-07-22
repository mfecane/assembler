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
	GraphController,
	GraphControllerSnapshot,
} from '@/parametric/controller/GraphController'
import { GraphInstanceGraphNode } from '@/parametric/model/GraphNode'

interface GraphTreeItem {
	key: string
	graphId: string
	label: string
	instanceId?: string
	children: GraphTreeItem[]
}

export function GraphTree({ controller }: { controller: GraphController }) {
	const { document, activeGraphId, revision } = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot
	)
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
								variant="ghost"
								size="sm"
								className="text-xs text-muted-foreground"
								aria-label="Select assembly"
							>
								<Network />
								Assemblies
								<ChevronDown className="opacity-50" />
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
				title={item.instanceId ? `${item.label} instance ${item.instanceId}` : item.label}
			>
				{depth > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
				{entry ? <FileBox className="h-3.5 w-3.5" /> : <Network className="h-3.5 w-3.5" />}
				<span className="truncate">{item.label}</span>
				{item.instanceId && (
					<span className="ml-auto truncate text-[9px] opacity-50">{item.instanceId}</span>
				)}
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

function createGraphTree(document: GraphControllerSnapshot['document']): {
	root: GraphTreeItem
	unused: GraphTreeItem[]
} {
	const reachable = new Set<string>()
	const build = (graphId: string, path: string, ancestors: ReadonlySet<string>): GraphTreeItem => {
		const graph = document.requireGraph(graphId)
		reachable.add(graphId)
		const nextAncestors = new Set(ancestors)
		nextAncestors.add(graphId)
		const children = graph.model.getNodes()
			.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
			.flatMap((node) => {
				const child = document.getGraph(node.getGraphId())
				if (!child || nextAncestors.has(child.id)) return []
				const childPath = `${path}/${node.id}`
				const item = build(child.id, childPath, nextAncestors)
				return [{ ...item, key: childPath, instanceId: node.id }]
			})
		return { key: path, graphId, label: graph.label, children }
	}

	const entryId = document.getEntryGraphId()
	const root = build(entryId, entryId, new Set())
	const unreachable = document.getGraphs().filter((graph) => !reachable.has(graph.id))
	const referencedByUnreachable = new Set(
		unreachable.flatMap((graph) =>
			graph.model.getNodes()
				.filter((node): node is GraphInstanceGraphNode => node instanceof GraphInstanceGraphNode)
				.map((node) => node.getGraphId())
		)
	)
	const unusedRoots = unreachable.filter((graph) => !referencedByUnreachable.has(graph.id))
	const unused = (unusedRoots.length > 0 ? unusedRoots : unreachable)
		.map((graph) => build(graph.id, `unused/${graph.id}`, new Set()))
	return { root, unused }
}
