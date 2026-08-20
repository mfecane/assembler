import { MaterialDefinition } from '@/parametric/model/MaterialDefinition'

export interface MaterialRegistrationTarget {
	add(material: MaterialDefinition): void
}

export class MaterialRegistrar {
	private readonly materials = new Map<string, MaterialDefinition>()

	public register(material: MaterialDefinition): void {
		if (this.materials.has(material.id)) {
			throw new Error(`Material "${material.id}" is already registered by this registrar`)
		}
		this.materials.set(material.id, material)
	}

	public registerInto(target: MaterialRegistrationTarget): void {
		for (const material of this.materials.values()) target.add(material)
	}
}
