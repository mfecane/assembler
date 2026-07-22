import type { GraphDocument } from '@/parametric/model/GraphSerialization'

export interface ProjectSummary {
	id: string
	name: string
	userEmail: string
	createdAt: string
	updatedAt: string
}

export interface Project extends ProjectSummary {
	graphDocument: GraphDocument
}
