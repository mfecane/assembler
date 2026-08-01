import type { TransformOrigin } from '@/parametric/model/GraphNode'
import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'
import { EnumField } from '@/parametric/model/fields/EnumField'

export interface TransformFieldSnapshot {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
	origin: TransformOrigin
}

const originOptions = ['min', 'middle', 'max'] as const

export class TransformField {
	private translation: Vector3Value
	private rotation: Vector3Value
	private scale: Vector3Value
	private readonly originX: EnumField<TransformOrigin['x']>
	private readonly originY: EnumField<TransformOrigin['y']>
	private readonly originZ: EnumField<TransformOrigin['z']>

	public constructor(snapshot: TransformFieldSnapshot = TransformField.identitySnapshot()) {
		this.translation = Vector3Value.from(snapshot.translation)
		this.rotation = Vector3Value.from(snapshot.rotation)
		this.scale = Vector3Value.from(snapshot.scale)
		this.originX = new EnumField(snapshot.origin.x, originOptions)
		this.originY = new EnumField(snapshot.origin.y, originOptions)
		this.originZ = new EnumField(snapshot.origin.z, originOptions)
	}

	public getTranslation(): Vector3Value { return this.translation }
	public setTranslation(value: Vector3Value): void { this.translation = value }
	public getRotation(): Vector3Value { return this.rotation }
	public setRotation(value: Vector3Value): void { this.rotation = value }
	public getScale(): Vector3Value { return this.scale }
	public setScale(value: Vector3Value): void { this.scale = value }
	public getOrigin(): TransformOrigin {
		return { x: this.originX.get(), y: this.originY.get(), z: this.originZ.get() }
	}
	public setOrigin(value: TransformOrigin): void {
		this.originX.set(value.x)
		this.originY.set(value.y)
		this.originZ.set(value.z)
	}

	public serialize(): TransformFieldSnapshot {
		return {
			translation: this.translation.toSnapshot(),
			rotation: this.rotation.toSnapshot(),
			scale: this.scale.toSnapshot(),
			origin: this.getOrigin(),
		}
	}

	public static identitySnapshot(): TransformFieldSnapshot {
		return {
			translation: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 },
			origin: { x: 'middle', y: 'middle', z: 'middle' },
		}
	}
}
