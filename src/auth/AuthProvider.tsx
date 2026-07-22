import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

interface AuthContextValue {
	session: Session | null
	user: User | null
	isLoading: boolean
	signInWithGoogle: () => Promise<void>
	signInLocally: (() => Promise<void>) | null
	signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const supabase = useMemo(() => getSupabaseClient(), [])
	const [session, setSession] = useState<Session | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let active = true
		void supabase.auth.getSession().then(({ data, error }) => {
			if (!active) return
			if (error) console.error('Unable to restore Supabase session', error)
			setSession(data.session)
			setIsLoading(false)
		})

		const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession)
			setIsLoading(false)
		})

		return () => {
			active = false
			subscription.subscription.unsubscribe()
		}
	}, [supabase])

	const signInWithGoogle = useCallback(async () => {
		const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo },
		})
		if (error) throw error
	}, [supabase])

	const signOut = useCallback(async () => {
		const { error } = await supabase.auth.signOut()
		if (error) throw error
	}, [supabase])

	const signInLocally = useMemo<(() => Promise<void>) | null>(() => {
		const email = import.meta.env.VITE_LOCAL_DEV_EMAIL
		const password = import.meta.env.VITE_LOCAL_DEV_PASSWORD
		if (!email || !password) return null

		return async () => {
			const { error } = await supabase.auth.signInWithPassword({ email, password })
			if (error) throw error
		}
	}, [supabase])

	const value = useMemo(
		() => ({
			session,
			user: session?.user ?? null,
			isLoading,
			signInWithGoogle,
			signInLocally,
			signOut,
		}),
		[session, isLoading, signInWithGoogle, signInLocally, signOut]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
	const value = useContext(AuthContext)
	if (!value) throw new Error('useAuth must be used inside AuthProvider')
	return value
}
