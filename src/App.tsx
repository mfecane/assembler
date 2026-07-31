import { type ComponentProps, useMemo, useState } from 'react'
import {
	HashRouter,
	Navigate,
	Route,
	Routes,
	useNavigate,
	useParams,
} from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { SignInScreen } from '@/auth/SignInScreen'
import { supabaseConfigurationError } from '@/lib/supabase'
import { ProjectDashboard } from '@/projects/ProjectDashboard'
import { ProjectEditor } from '@/projects/ProjectEditor'
import { ProjectRepository } from '@/projects/ProjectRepository'

function App() {
	if (supabaseConfigurationError) {
		return (
			<main
				data-id="supabase-configuration-error"
				className="flex min-h-full items-center justify-center p-6"
			>
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
		<HashRouter>
			<AuthProvider>
				<AuthenticatedApplication />
			</AuthProvider>
		</HashRouter>
	)
}

function AuthenticatedApplication() {
	const { user, isLoading, signOut } = useAuth()
	const [authError, setAuthError] = useState<string | null>(null)
	const repository = useMemo(
		() => user ? new ProjectRepository(user) : null,
		[user?.id]
	)

	const handleSignOut = async () => {
		setAuthError(null)
		try {
			await signOut()
		} catch (cause) {
			setAuthError(cause instanceof Error ? cause.message : 'Sign out failed. Please try again.')
		}
	}

	if (isLoading) {
		return (
			<div
				data-id="session-loading"
				className="flex min-h-full items-center justify-center text-sm"
			>
				Restoring session…
			</div>
		)
	}
	if (!user || !repository) return <SignInScreen />

	return (
		<>
			{authError && (
				<div
					data-id="authentication-error"
					role="alert"
					className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-md bg-danger px-4 py-2 text-sm text-white shadow-lg"
				>
					{authError}
				</div>
			)}
			<Routes>
				<Route path="/" element={<Navigate to="/projects" replace />} />
				<Route
					path="/projects"
					element={
						<ProjectDashboardRoute
							user={user}
							repository={repository}
							onSignOut={() => void handleSignOut()}
						/>
					}
				/>
				<Route
					path="/projects/:projectId"
					element={
						<ProjectEditorRoute
							user={user}
							repository={repository}
							onSignOut={() => void handleSignOut()}
						/>
					}
				/>
				<Route path="*" element={<Navigate to="/projects" replace />} />
			</Routes>
		</>
	)
}

function ProjectDashboardRoute({
	user,
	repository,
	onSignOut,
}: Pick<ComponentProps<typeof ProjectDashboard>, 'user' | 'repository' | 'onSignOut'>) {
	const navigate = useNavigate()

	return (
		<ProjectDashboard
			user={user}
			repository={repository}
			onOpen={(projectId) => navigate(`/projects/${encodeURIComponent(projectId)}`)}
			onSignOut={onSignOut}
		/>
	)
}

function ProjectEditorRoute({
	user,
	repository,
	onSignOut,
}: Pick<ComponentProps<typeof ProjectEditor>, 'user' | 'repository' | 'onSignOut'>) {
	const navigate = useNavigate()
	const { projectId } = useParams<{ projectId: string }>()

	if (!projectId) return <Navigate to="/projects" replace />

	return (
		<ProjectEditor
			projectId={projectId}
			user={user}
			repository={repository}
			onBack={() => navigate('/projects')}
			onOpenProject={(nextProjectId) => (
				navigate(`/projects/${encodeURIComponent(nextProjectId)}`)
			)}
			onSignOut={onSignOut}
		/>
	)
}

export default App
