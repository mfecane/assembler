import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthProvider'

export function SignInScreen() {
	const { signInWithGoogle, signInLocally } = useAuth()
	const [error, setError] = useState<string | null>(() => getOAuthError())
	const [isStarting, setIsStarting] = useState(false)

	const handleSignIn = async () => {
		setError(null)
		setIsStarting(true)
		try {
			await signInWithGoogle()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Google sign-in failed. Please try again.')
			setIsStarting(false)
		}
	}

	const handleLocalSignIn = async () => {
		if (!signInLocally) return
		setError(null)
		setIsStarting(true)
		try {
			await signInLocally()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Local sign-in failed.')
			setIsStarting(false)
		}
	}

	return (
		<main className="flex min-h-full items-center justify-center p-6">
			<section className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-xl">
				<p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Assembler</p>
				<h1 className="mb-2 mt-3 text-3xl font-semibold text-foreground">Build in the cloud</h1>
				<p className="mb-7 mt-0 text-sm leading-6 text-muted-foreground">
					Sign in to create, open, and save your parametric projects.
				</p>
				<Button className="w-full" disabled={isStarting} onClick={() => void handleSignIn()}>
					{isStarting ? 'Redirecting…' : 'Continue with Google'}
				</Button>
				{signInLocally && (
					<>
						<div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
							<span className="h-px flex-1 bg-border" />
							Local emulator
							<span className="h-px flex-1 bg-border" />
						</div>
						<Button
							className="w-full"
							variant="outline"
							disabled={isStarting}
							onClick={() => void handleLocalSignIn()}
						>
							Continue as local developer
						</Button>
					</>
				)}
				{error && (
					<p role="alert" className="mb-0 mt-4 text-sm text-danger">
						{error}
					</p>
				)}
			</section>
		</main>
	)
}

function getOAuthError(): string | null {
	const query = new URLSearchParams(window.location.search)
	const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
	return query.get('error_description') ?? hash.get('error_description')
}
