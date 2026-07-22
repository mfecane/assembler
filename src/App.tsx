import { useMemo, useState } from 'react'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { SignInScreen } from '@/auth/SignInScreen'
import { supabaseConfigurationError } from '@/lib/supabase'
import { ProjectDashboard } from '@/projects/ProjectDashboard'
import { ProjectEditor } from '@/projects/ProjectEditor'
import { ProjectRepository } from '@/projects/ProjectRepository'

function App() {
	if (supabaseConfigurationError) {
		return (
			<main className="flex min-h-full items-center justify-center p-6">
				<section className="max-w-xl rounded-lg border border-danger/50 bg-surface p-6">
					<h1 className="m-0 text-xl font-semibold">Supabase setup required</h1>
					<p className="mb-0 mt-3 text-sm leading-6 text-muted-foreground">
						{supabaseConfigurationError}
					</p>
				</section>
			</main>
		)
	}

	return (
		<AuthProvider>
			<AuthenticatedApplication />
		</AuthProvider>
	)
}

function AuthenticatedApplication() {
	const { user, isLoading, signOut } = useAuth()
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	const [authError, setAuthError] = useState<string | null>(null)
	const repository = useMemo(
		() => user ? new ProjectRepository(user) : null,
		[user?.id]
	)

	const handleSignOut = async () => {
		setAuthError(null)
		try {
			await signOut()
			setSelectedProjectId(null)
		} catch (cause) {
			setAuthError(cause instanceof Error ? cause.message : 'Sign out failed. Please try again.')
		}
	}

	if (isLoading) {
		return <div className="flex min-h-full items-center justify-center text-sm">Restoring session…</div>
	}
	if (!user || !repository) return <SignInScreen />

	return (
		<>
			{authError && (
				<div role="alert" className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-md bg-danger px-4 py-2 text-sm text-white shadow-lg">
					{authError}
				</div>
			)}
			{selectedProjectId ? (
				<ProjectEditor
					projectId={selectedProjectId}
					user={user}
					repository={repository}
					onBack={() => setSelectedProjectId(null)}
					onOpenProject={setSelectedProjectId}
					onSignOut={() => void handleSignOut()}
				/>
			) : (
				<ProjectDashboard
					user={user}
					repository={repository}
					onOpen={setSelectedProjectId}
					onSignOut={() => void handleSignOut()}
				/>
			)}
		</>
	)
}

export default App
