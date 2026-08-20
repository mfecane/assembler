import type { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export function UserMenu({
	user,
	onSignOut,
	disabled = false,
}: {
	user: User
	onSignOut: () => void
	disabled?: boolean
}) {
	const avatarUrl = typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null
	const displayName = getDisplayName(user)

	return (
		<div data-id="user-menu">
			<Popover>
				<PopoverTrigger asChild>
					<Button
						data-id="user-menu-trigger"
						type="button"
						size="icon"
						variant="ghost"
						className="rounded-full"
						disabled={disabled}
						aria-label={`Open account menu for ${displayName}`}
						aria-haspopup="menu"
					>
						<Avatar data-id="user-menu-avatar" className="h-8 w-8">
							{avatarUrl && (
								<AvatarImage
									src={avatarUrl}
									alt={`${displayName} avatar`}
									referrerPolicy="no-referrer"
								/>
							)}
							<AvatarFallback className="text-xs font-medium">
								{getInitials(displayName)}
							</AvatarFallback>
						</Avatar>
					</Button>
				</PopoverTrigger>
				<PopoverContent data-id="user-menu-dropdown" align="end" className="w-64 p-2">
					<div data-id="user-menu-account" className="px-2 py-1.5">
						<p className="m-0 truncate text-sm font-medium">{displayName}</p>
						<p data-id="user-menu-email" className="m-0 truncate text-xs text-muted-foreground">
							{user.email}
						</p>
					</div>
					<Separator className="my-1" />
					<div role="menu" aria-label="Account actions">
						<Button
							data-id="user-menu-sign-out"
							type="button"
							variant="ghost"
							className="h-9 w-full justify-start px-2 font-normal"
							role="menuitem"
							onClick={onSignOut}
						>
							<LogOut />
							Sign out
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}

function getDisplayName(user: User): string {
	const metadataName = [user.user_metadata.full_name, user.user_metadata.name].find(
		(value): value is string => typeof value === 'string' && value.trim().length > 0
	)

	return metadataName?.trim() ?? user.email?.split('@')[0] ?? 'User'
}

function getInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/)
	return parts
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase()
}
