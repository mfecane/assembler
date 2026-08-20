import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Client } from '@/cosntants'

export function ClientSelector({
	value,
	onValueChange,
}: {
	value: Client
	onValueChange: (client: Client) => void
}) {
	return (
		<div data-id="client-selector" className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">Client</span>
			<Select value={value} onValueChange={(client) => onValueChange(client as Client)}>
				<SelectTrigger data-id="client-selector-trigger" className="w-40" aria-label="Client">
					<SelectValue />
				</SelectTrigger>
				<SelectContent data-id="client-selector-options">
					<SelectItem value={Client.MAXSHELF}>MaxShelf</SelectItem>
					<SelectItem value={Client.KITCHEN}>Kitchen</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
