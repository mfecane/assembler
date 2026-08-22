import { ChevronDown, CircleMinus, CirclePlus } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface NodeCapabilityProps {
	nodeId: string
	label: string
	children: ReactNode
	activeWhen?: boolean
	onActivate?: () => void
	onDeactivate?: () => void
	deactivatable?: boolean
	collapsible?: boolean
}

export function NodeCapability({
	nodeId,
	label,
	children,
	activeWhen = false,
	onActivate,
	onDeactivate,
	deactivatable = true,
	collapsible = true,
}: NodeCapabilityProps) {
	const [active, setActive] = useState(activeWhen)
	const [expanded, setExpanded] = useState(true)
	const capabilityId = `${nodeId}-${label.toLowerCase().replace(/\s+/g, '-')}`

	useEffect(() => {
		if (activeWhen) setActive(true)
	}, [activeWhen])

	if (!active) {
		return (
			<Button
				data-id={`node-capability-activate-${capabilityId}`}
				type="button"
				variant="ghost"
				size="sm"
				className="nodrag h-7 w-full justify-between px-0 text-xs font-normal text-muted-foreground"
				onClick={() => {
					onActivate?.()
					setActive(true)
					setExpanded(true)
				}}
			>
				{label}
				<CirclePlus className="size-3.5" aria-hidden="true" />
			</Button>
		)
	}

	if (!collapsible) {
		return (
			<div data-id={`node-capability-${capabilityId}`} className="nodrag">
				<div className="flex h-7 items-center gap-1">
					<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
					{deactivatable && (
						<Button
							data-id={`node-capability-deactivate-${capabilityId}`}
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 shrink-0 text-muted-foreground"
							title={`Remove ${label}`}
							aria-label={`Remove ${label}`}
							onClick={() => {
								onDeactivate?.()
								setActive(false)
							}}
						>
							<CircleMinus className="size-3.5" />
						</Button>
					)}
				</div>
				<div className="pb-1 pt-1">{children}</div>
			</div>
		)
	}

	return (
		<Collapsible
			data-id={`node-capability-${capabilityId}`}
			className="group nodrag"
			open={expanded}
			onOpenChange={setExpanded}
		>
			<div className="flex h-7 items-center gap-1">
				<CollapsibleTrigger
					data-id={`node-capability-trigger-${capabilityId}`}
					className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground"
				>
					<ChevronDown
						className="size-3.5 shrink-0 transition-transform group-data-[state=closed]:-rotate-90"
						aria-hidden="true"
					/>
					<span className="truncate">{label}</span>
				</CollapsibleTrigger>
				{deactivatable && (
					<Button
						data-id={`node-capability-deactivate-${capabilityId}`}
						type="button"
						variant="ghost"
						size="icon"
						className="h-7 w-7 shrink-0 text-muted-foreground"
						title={`Remove ${label}`}
						aria-label={`Remove ${label}`}
						onClick={() => {
							onDeactivate?.()
							setActive(false)
						}}
					>
						<CircleMinus className="size-3.5" />
					</Button>
				)}
			</div>
			<CollapsibleContent className="pb-1 pt-1">{children}</CollapsibleContent>
		</Collapsible>
	)
}
