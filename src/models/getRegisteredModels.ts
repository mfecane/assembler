import type { Client } from '@/cosntants'
import { ModelCatalogItem } from '@/models/ModelCatalogItem'
import { meshRepository } from '@/parametric/three/MeshRepository'

export function getRegisteredModels(client: Client): ModelCatalogItem[] {
	return meshRepository
		.forClient(client)
		.getMeshes()
		.filter((mesh) => mesh.client === client && mesh.selectable)
		.map((mesh) => new ModelCatalogItem(mesh.id, client, mesh.label))
		.sort((left, right) => left.name.localeCompare(right.name))
}
