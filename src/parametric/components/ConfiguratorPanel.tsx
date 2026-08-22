import { useState } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ConfigurationFields } from '@/parametric/components/ConfigurationFields'
import { useConfiguration } from '@/parametric/hooks/useConfiguration'

export function ConfiguratorPanel() {
	const [expanded, setExpanded] = useState(true)
	const { isRootGraphOpen, rootGraphId, rootLabel, fields, setValue } = useConfiguration()
	if (fields.length === 0) return null

	return (
		<aside
			data-id={isRootGraphOpen ? 'configuration-panel' : 'subgraph-input-panel'}
			data-root-graph-id={rootGraphId}
			className={expanded
				? 'h-full w-64 shrink-0 border-l border-border bg-surface'
				: 'h-full w-12 shrink-0 border-l border-border bg-surface'}
		>
			<Collapsible open={expanded} onOpenChange={setExpanded} className="flex h-full flex-col">
				<div data-id="configuration-panel-header" className="flex h-12 shrink-0 items-center border-b border-border px-3">
					{expanded && <div className="flex min-w-0 flex-1 items-center gap-2">
						<SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
						<h2 className="m-0 truncate text-sm font-semibold" title={`Configuration for ${rootLabel}`}>
							Configuration · {rootLabel}
						</h2>
					</div>}
					<CollapsibleTrigger asChild>
						<Button data-id="configuration-panel-toggle" type="button" variant="ghost" size="icon"
							className={expanded ? 'ml-auto' : 'w-full'} aria-label={expanded ? 'Collapse configuration panel' : 'Expand configuration panel'}>
							{expanded ? <ChevronRight /> : <ChevronLeft />}
						</Button>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent id="configuration-panel-fields" data-id="configuration-panel-fields"
					className="min-h-0 flex-1 overflow-y-auto p-3">
					<ConfigurationFields fields={fields} idPrefix="configuration" onValueChange={setValue} />
				</CollapsibleContent>
			</Collapsible>
		</aside>
	)
}
