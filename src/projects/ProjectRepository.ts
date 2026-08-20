import type { User } from '@supabase/supabase-js'
import type { Client } from '@/cosntants'
import { getSupabaseClient } from '@/lib/supabase'
import type { GraphDocument } from '@/parametric/model/GraphSerialization'
import type { Project, ProjectSummary } from '@/projects/projectTypes'

interface SummaryRow {
	id: string
	name: string
	user_email: string
	created_at: string
	updated_at: string
}

interface ProjectRow extends SummaryRow {
	graph_document: unknown
}

export class ProjectRepository {
	private readonly supabase = getSupabaseClient()

	public constructor(private readonly user: User) {}

	public async list(client: Client): Promise<ProjectSummary[]> {
		const { data, error } = await this.supabase
			.from('projects')
			.select('id, name, user_email, created_at, updated_at')
			.eq('graph_document->>client', client)
			.order('updated_at', { ascending: false })
		if (error) throw error
		return (data as SummaryRow[]).map(toSummary)
	}

	public async get(id: string): Promise<Project> {
		const { data, error } = await this.supabase
			.from('projects')
			.select('id, name, user_email, created_at, updated_at, graph_document')
			.eq('id', id)
			.single()
		if (error) throw error
		return toProject(data as ProjectRow)
	}

	public async create(name: string, document: GraphDocument): Promise<Project> {
		if (!this.user.email) {
			throw new Error(
				`Project creation failed for authenticated user ${this.user.id}: the user account has no email address.`
			)
		}

		const { data, error } = await this.supabase
			.from('projects')
			.insert({
				user_id: this.user.id,
				user_email: this.user.email,
				name,
				graph_document: document,
			})
			.select('id, name, user_email, created_at, updated_at, graph_document')
			.single()
		if (error) throw error
		return toProject(data as ProjectRow)
	}

	public async save(id: string, document: GraphDocument): Promise<Project> {
		const { data, error } = await this.supabase
			.from('projects')
			.update({ graph_document: document })
			.eq('id', id)
			.select('id, name, user_email, created_at, updated_at, graph_document')
			.single()
		if (error) throw error
		return toProject(data as ProjectRow)
	}

	public async rename(id: string, name: string): Promise<Project> {
		const { data, error } = await this.supabase
			.from('projects')
			.update({ name })
			.eq('id', id)
			.select('id, name, user_email, created_at, updated_at, graph_document')
			.single()
		if (error) throw error
		return toProject(data as ProjectRow)
	}

	public async remove(id: string): Promise<void> {
		const { error } = await this.supabase.from('projects').delete().eq('id', id)
		if (error) throw error
	}
}

function toSummary(row: SummaryRow): ProjectSummary {
	return {
		id: row.id,
		name: row.name,
		userEmail: row.user_email,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function toProject(row: ProjectRow): Project {
	return {
		...toSummary(row),
		graphDocument: row.graph_document as GraphDocument,
	}
}
