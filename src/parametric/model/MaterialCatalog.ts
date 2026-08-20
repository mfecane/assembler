import type { MaterialDefinition } from '@/parametric/model/MaterialDefinition'

export interface MaterialCatalog {
	getMaterials(): readonly MaterialDefinition[]
	getMaterial(id: string): MaterialDefinition | undefined
}
