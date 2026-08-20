import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ModelCatalogItem } from '@/models/ModelCatalogItem'

export function ModelSelector({
	models,
	value,
	disabled,
	onValueChange,
}: {
	models: readonly ModelCatalogItem[]
	value: string | undefined
	disabled: boolean
	onValueChange: (modelId: string) => void
}) {
	const [open, setOpen] = useState(false)
	const selectedModel = models.find((model) => model.id === value)

	return (
		<div data-id="model-selector" className="min-w-56 flex-1 sm:max-w-sm">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						data-id="model-selector-trigger"
						type="button"
						role="combobox"
						aria-label="Choose model"
						aria-expanded={open}
						variant="outline"
						className="h-11 w-full justify-between px-3 font-normal"
						disabled={disabled}
					>
						<span className="min-w-0 text-left">
							<span className="block truncate text-sm font-medium">
								{selectedModel?.name ?? (models.length === 0 ? 'No models' : 'Select model')}
							</span>
							{selectedModel && (
								<span className="block truncate text-xs text-muted-foreground">{selectedModel.id}</span>
							)}
						</span>
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					data-id="model-selector-options"
					align="start"
					className="w-[var(--radix-popover-trigger-width)] p-0"
				>
					<Command>
						<CommandInput data-id="model-selector-search" placeholder="Search models…" />
						<CommandList>
							<CommandEmpty>No matching model.</CommandEmpty>
							<CommandGroup>
								{models.map((model) => (
									<CommandItem
										key={model.id}
										value={`${model.name} ${model.id}`}
										onSelect={() => {
											setOpen(false)
											if (model.id !== value) onValueChange(model.id)
										}}
									>
										<Check
											className={cn('mr-2 size-4', model.id === value ? 'opacity-100' : 'opacity-0')}
										/>
										<span className="min-w-0">
											<span className="block truncate">{model.name}</span>
											<span className="block truncate text-xs text-muted-foreground">{model.id}</span>
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	)
}
