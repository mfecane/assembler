import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const user = {
	id: '10000000-0000-4000-8000-000000000001',
	email: 'developer@assembler.local',
	password: 'assembler-local',
}
const projectId = '20000000-0000-4000-8000-000000000001'
const projectName = 'Seeded MaxShelf configurator'
const defaultGraph = JSON.parse(
	readFileSync(new URL('../src/data/defaultGraph.json', import.meta.url), 'utf8')
)
const apiUrl = process.env.SUPABASE_INTERNAL_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!apiUrl || !secretKey) {
	throw new Error('The seed service is missing its Supabase configuration.')
}
const admin = createClient(apiUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false },
})

const { data: existingUsers, error: listUsersError } = await admin.auth.admin.listUsers({
	page: 1,
	perPage: 1000,
})
if (listUsersError) throw listUsersError

const existingUser = existingUsers.users.find(
	(candidate) => candidate.id === user.id || candidate.email === user.email
)
const ownerId = existingUser?.id ?? user.id
if (existingUser) {
	const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
		email: user.email,
		password: user.password,
		email_confirm: true,
	})
	if (error) throw error
} else {
	const { error } = await admin.auth.admin.createUser({
		id: user.id,
		email: user.email,
		password: user.password,
		email_confirm: true,
	})
	if (error) throw error
}

const { error: projectError } = await admin
	.from('projects')
	.upsert(
		{
			id: projectId,
			user_id: ownerId,
			user_email: user.email,
			name: projectName,
			graph_document: defaultGraph,
		},
		{ onConflict: 'id' }
	)

if (projectError) {
	throw new Error(
		`Failed to seed project "${projectName}" (${projectId}) for `
		+ `local user "${user.email}" (${ownerId}): ${projectError.message}`,
		{ cause: projectError }
	)
}

console.log(`Seeded ${user.email} and the default MaxShelf configurator project.`)
