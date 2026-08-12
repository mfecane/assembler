export interface Vector3Snapshot {
	x: number
	y: number
	z: number
}

export class Vector3Value {
	public static isSnapshot(value: unknown): value is Vector3Snapshot {
		if (!value || typeof value !== 'object') return false
		const snapshot = value as Partial<Vector3Snapshot>
		return Number.isFinite(snapshot.x) && Number.isFinite(snapshot.y) && Number.isFinite(snapshot.z)
	}

	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number
	) {}

	public static from(value: Vector3Snapshot): Vector3Value {
		return new Vector3Value(value.x, value.y, value.z)
	}

	public toSnapshot(): Vector3Snapshot {
		return { x: this.x, y: this.y, z: this.z }
	}
}
