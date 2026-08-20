import { MaterialDefinition } from '@/parametric/model/MaterialDefinition'
import type { MaterialRegistrar } from '@/parametric/three/MaterialRegistrar'
import marbleTextureUrl from '../../../assets/textures/marble.jpg?url'
import plasticTextureUrl from '../../../assets/textures/plastic.jpg?url'
import woodTextureUrl from '../../../assets/textures/wood.jpg?url'

export function registerPbrMaterials(registrar: MaterialRegistrar): void {
	registrar.register(new MaterialDefinition('plastic', 'Plastic', plasticTextureUrl, 0.36, 0.08))
	registrar.register(new MaterialDefinition('wood', 'Wood', woodTextureUrl, 0.58, 0))
	registrar.register(new MaterialDefinition('marble', 'Marble', marbleTextureUrl, 0.24, 0.04))
	registrar.register(new MaterialDefinition('metal', 'Metal', null, 0.28, 1))
}
