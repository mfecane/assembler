import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

export function ModelPanelSection({
	id,
	title,
	icon: Icon,
	status,
	children,
	className,
	contentClassName,
}: {
	id: string
	title: string
	icon: LucideIcon
	status?: ReactNode
	children: ReactNode
	className?: string
	contentClassName?: string
}) {
	return (
		<AccordionItem data-id={id} value={id} className={className}>
			<AccordionTrigger
				data-id={`${id}-toggle`}
				className="gap-3 py-3 hover:no-underline"
			>
				<span className="flex min-w-0 flex-1 items-center gap-2.5">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/30">
						<Icon className="size-4 text-muted-foreground" aria-hidden="true" />
					</span>
					<span className="truncate font-semibold">{title}</span>
					{status && <span className="ml-auto shrink-0">{status}</span>}
				</span>
			</AccordionTrigger>
			<AccordionContent data-id={`${id}-content`} className={cn('space-y-4', contentClassName)}>
				{children}
			</AccordionContent>
		</AccordionItem>
	)
}
