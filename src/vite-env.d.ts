/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string
	readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
	readonly VITE_LOCAL_DEV_EMAIL?: string
	readonly VITE_LOCAL_DEV_PASSWORD?: string
}
