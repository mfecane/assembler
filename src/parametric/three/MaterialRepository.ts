import type { MaterialCatalog } from '@/parametric/model/MaterialCatalog'
import { MaterialDefinition } from '@/parametric/model/MaterialDefinition'
import { MaterialRegistrar } from '@/parametric/three/MaterialRegistrar'
import { registerPbrMaterials } from '@/parametric/three/registerPbrMaterials'

export class MaterialRepository implements MaterialCatalog {
	private readonly materials = new Map<string, MaterialDefinition>()

	public add(material: MaterialDefinition): void {
		if (this.materials.has(material.id)) {
			throw new Error(`Material "${material.id}" is already registered`)
		}
		this.materials.set(material.id, material)
	}

	public getMaterials(): readonly MaterialDefinition[] {
		return [...this.materials.values()]
	}

	public getMaterial(id: string): MaterialDefinition | undefined {
		return this.materials.get(id)
	}

	public requireMaterial(id: string): MaterialDefinition {
		const material = this.materials.get(id)
		if (!material) {
			throw new Error(
				`Unknown material "${id}". Registered materials: ${JSON.stringify([...this.materials.keys()])}.`
			)
		}
		return material
	}
}

function createMaterialRepository(): MaterialRepository {
	const repository = new MaterialRepository()
	const registrar = new MaterialRegistrar()
	registerPbrMaterials(registrar)
	registrar.registerInto(repository)
	return repository
}

export const materialRepository = createMaterialRepository()
