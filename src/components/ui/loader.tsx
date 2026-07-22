import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: 'sm' | 'md' | 'lg'
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
	({ className, size = 'md', ...props }, ref) => {
		const sizeClasses = {
			sm: 'h-4 w-4',
			md: 'h-6 w-6',
			lg: 'h-8 w-8',
		}

		return (
			<div ref={ref} className={cn('flex items-center justify-center', className)} {...props}>
				<Loader2 className={cn('animate-spin text-gray-400', sizeClasses[size])} />
			</div>
		)
	}
)
Loader.displayName = 'Loader'

export { Loader }
