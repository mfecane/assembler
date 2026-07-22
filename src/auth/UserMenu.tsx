import type { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

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
		<div data-id="user-menu" className="flex items-center gap-3">
			<Avatar data-id="user-menu-avatar" className="h-8 w-8">
				{avatarUrl && (
					<AvatarImage src={avatarUrl} alt={`${displayName} avatar`} referrerPolicy="no-referrer" />
				)}
				<AvatarFallback className="text-xs font-medium">{getInitials(displayName)}</AvatarFallback>
			</Avatar>
			<span data-id="user-menu-email" className="hidden max-w-48 truncate text-sm text-muted-foreground sm:block">
				{user.email}
			</span>
			<Button
				data-id="user-menu-sign-out"
				type="button"
				size="sm"
				variant="outline"
				disabled={disabled}
				onClick={onSignOut}
			>
				<LogOut />
				Sign out
			</Button>
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
