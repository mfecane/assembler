import type { BufferAttribute, InterleavedBufferAttribute } from 'three'

export class ModelUvAttribute {
	public readonly vertexCount: number
	public readonly minU: number
	public readonly maxU: number
	public readonly minV: number
	public readonly maxV: number

	public constructor(attribute: BufferAttribute | InterleavedBufferAttribute) {
		if (attribute.itemSize < 2) {
			throw new Error(
				`Cannot inspect UV attribute with itemSize ${attribute.itemSize}; expected at least 2 components.`
			)
		}
		if (attribute.count === 0) {
			throw new Error('Cannot inspect an empty UV attribute because it contains no coordinates.')
		}

		this.vertexCount = attribute.count
		let minU = Infinity
		let maxU = -Infinity
		let minV = Infinity
		let maxV = -Infinity
		for (let vertex = 0; vertex < attribute.count; vertex += 1) {
			const u = attribute.getX(vertex)
			const v = attribute.getY(vertex)
			if (!Number.isFinite(u) || !Number.isFinite(v)) {
				throw new Error(
					`Cannot inspect UV attribute because vertex ${vertex} has non-finite coordinates U ${u}, V ${v}.`
				)
			}
			minU = Math.min(minU, u)
			maxU = Math.max(maxU, u)
			minV = Math.min(minV, v)
			maxV = Math.max(maxV, v)
		}
		this.minU = minU
		this.maxU = maxU
		this.minV = minV
		this.maxV = maxV
	}

	public isDegenerate(): boolean {
		return this.minU === this.maxU || this.minV === this.maxV
	}

	public isCollapsedToPoint(): boolean {
		return this.minU === this.maxU && this.minV === this.maxV
	}
}
