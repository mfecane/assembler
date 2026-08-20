export async function seedUserProjects(admin, seedData) {
	const { user } = seedData
	const { data: existingUsers, error: listUsersError } = await admin.auth.admin.listUsers({
		page: 1,
		perPage: 1000,
	})
	if (listUsersError) throw listUsersError

	const existingUser = existingUsers.users.find(
		(candidate) => candidate.id === user.id || candidate.email === user.email
	)
	const ownerId = existingUser?.id ?? user.id
	const { error: userError } = existingUser
		? await admin.auth.admin.updateUserById(ownerId, {
			email: user.email,
			password: user.password,
			email_confirm: true,
		})
		: await admin.auth.admin.createUser({
			id: user.id,
			email: user.email,
			password: user.password,
			email_confirm: true,
		})
	if (userError) {
		throw new Error(
			`Failed to create or update local user "${user.email}" (${ownerId}): ${userError.message}`,
			{ cause: userError }
		)
	}

	const projects = seedData.projects.map(({ graphDocument, ...project }) => ({
		...project,
		user_id: ownerId,
		user_email: user.email,
		graph_document: graphDocument,
	}))
	const { error: projectsError } = await admin.from('projects').upsert(projects, { onConflict: 'id' })
	if (projectsError) {
		throw new Error(
			`Failed to seed one default project per client for local user "${user.email}" (${ownerId}). `
			+ `Project IDs: ${JSON.stringify(projects.map((project) => project.id))}. ${projectsError.message}`,
			{ cause: projectsError }
		)
	}
}
