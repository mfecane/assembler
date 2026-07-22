import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabaseConfigurationError =
	!supabaseUrl || !supabasePublishableKey
		? 'Supabase is not configured. Copy .env.example to .env.local and add the project URL and publishable key.'
		: null

let client: SupabaseClient | undefined

export function getSupabaseClient(): SupabaseClient {
	if (supabaseConfigurationError) throw new Error(supabaseConfigurationError)
	client ??= createClient(supabaseUrl!, supabasePublishableKey!)
	return client
}
