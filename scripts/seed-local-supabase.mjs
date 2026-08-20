import { createClient } from '@supabase/supabase-js'
import { loadSeedData } from './seed/seed-data.mjs'
import { seedModelMetadata } from './seed/seed-model-metadata.mjs'
import { seedUserProjects } from './seed/seed-user-projects.mjs'

const apiUrl = process.env.SUPABASE_INTERNAL_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!apiUrl || !secretKey) {
	throw new Error(
		'Seed service configuration is incomplete: SUPABASE_INTERNAL_URL and SUPABASE_SECRET_KEY are required.'
	)
}

const admin = createClient(apiUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false },
})
const seedData = loadSeedData()

await seedModelMetadata(admin, seedData)
await seedUserProjects(admin, seedData)

console.log(
	`Seeded ${seedData.user.email}, optional registered-model metadata, and one default project per client.`
)
