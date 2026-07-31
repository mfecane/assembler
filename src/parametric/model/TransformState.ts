import { Vector3Value, type Vector3Snapshot } from '@/parametric/model/Vector3Value'

export type OriginAxis = 'min' | 'middle' | 'max'

export interface TransformOrigin {
	x: OriginAxis
	y: OriginAxis
	z: OriginAxis
}

export interface TransformSnapshot {
	translation: Vector3Snapshot
	rotation: Vector3Snapshot
	scale: Vector3Snapshot
	origin: TransformOrigin
	copy: boolean
	uniformScale: boolean
}

export class TransformState {
	public constructor(
		private translation: Vector3Value,
		private rotation: Vector3Value,
		private scale: Vector3Value,
		private origin: TransformOrigin,
		private copy: boolean,
		private uniformScale: boolean
	) {}

	public static identity(): TransformState {
		return new TransformState(
			new Vector3Value(0, 0, 0),
			new Vector3Value(0, 0, 0),
			new Vector3Value(1, 1, 1),
			{ x: 'middle', y: 'middle', z: 'middle' },
			false,
			true
		)
	}

	public static from(value: unknown, context: string): TransformState {
		if (!value || typeof value !== 'object') {
			throw new Error(`${context}: expected a transform object, received ${describe(value)}`)
		}
		const snapshot = value as Partial<TransformSnapshot>
		return new TransformState(
			readVector(snapshot.translation, `${context}.translation`),
			readVector(snapshot.rotation, `${context}.rotation`),
			readVector(snapshot.scale, `${context}.scale`),
			readOrigin(snapshot.origin, `${context}.origin`),
			readBoolean(snapshot.copy, `${context}.copy`),
			readBoolean(snapshot.uniformScale, `${context}.uniformScale`)
		)
	}

	public toSnapshot(): TransformSnapshot {
		return {
			translation: this.translation.toSnapshot(),
			rotation: this.rotation.toSnapshot(),
			scale: this.scale.toSnapshot(),
			origin: { ...this.origin },
			copy: this.copy,
			uniformScale: this.uniformScale,
		}
	}

	public replace(value: TransformState): void {
		this.translation = value.getTranslation()
		this.rotation = value.getRotation()
		this.scale = value.getScale()
		this.origin = value.getOrigin()
		this.copy = value.getCopy()
		this.uniformScale = value.getUniformScale()
	}

	public getTranslation(): Vector3Value {
		return this.translation
	}

	public setTranslation(value: Vector3Value): void {
		this.translation = value
	}

	public getRotation(): Vector3Value {
		return this.rotation
	}

	public setRotation(value: Vector3Value): void {
		this.rotation = value
	}

	public getScale(): Vector3Value {
		return this.scale
	}

	public setScale(value: Vector3Value): void {
		this.scale = value
	}

	public getOrigin(): TransformOrigin {
		return { ...this.origin }
	}

	public setOrigin(value: TransformOrigin): void {
		this.origin = { ...value }
	}

	public getCopy(): boolean {
		return this.copy
	}

	public setCopy(value: boolean): void {
		this.copy = value
	}

	public getUniformScale(): boolean {
		return this.uniformScale
	}

	public setUniformScale(value: boolean): void {
		this.uniformScale = value
		if (value) this.scale = new Vector3Value(this.scale.x, this.scale.x, this.scale.x)
	}
}

function readVector(value: unknown, path: string): Vector3Value {
	if (!value || typeof value !== 'object') {
		throw new Error(`${path}: expected { x, y, z }, received ${describe(value)}`)
	}
	const vector = value as Partial<Vector3Snapshot>
	for (const axis of ['x', 'y', 'z'] as const) {
		if (typeof vector[axis] !== 'number' || !Number.isFinite(vector[axis])) {
			throw new Error(`${path}.${axis}: expected a finite number, received ${describe(vector[axis])}`)
		}
	}
	return new Vector3Value(vector.x as number, vector.y as number, vector.z as number)
}

function readOrigin(value: unknown, path: string): TransformOrigin {
	if (!value || typeof value !== 'object') {
		throw new Error(`${path}: expected { x, y, z }, received ${describe(value)}`)
	}
	const origin = value as Partial<TransformOrigin>
	for (const axis of ['x', 'y', 'z'] as const) {
		if (!['min', 'middle', 'max'].includes(origin[axis] ?? '')) {
			throw new Error(`${path}.${axis}: expected min, middle, or max, received ${describe(origin[axis])}`)
		}
	}
	return origin as TransformOrigin
}

function readBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') {
		throw new Error(`${path}: expected a boolean, received ${describe(value)}`)
	}
	return value
}

function describe(value: unknown): string {
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}
