import {
	BufferGeometry,
	Color,
	Float32BufferAttribute,
	LineSegments,
	ShaderMaterial,
} from 'three'
import { SCENE_CONSTANTS } from '@/constants'

export class TechnicalGrid extends LineSegments<BufferGeometry, ShaderMaterial> {
	public constructor() {
		super(createTechnicalGridGeometry(), createTechnicalGridMaterial())
	}

	public dispose(): void {
		this.geometry.dispose()
		this.material.dispose()
	}
}

function createTechnicalGridGeometry(): BufferGeometry {
	const center = SCENE_CONSTANTS.TECHNICAL_GRID.divisions / 2
	const step = SCENE_CONSTANTS.TECHNICAL_GRID.size / SCENE_CONSTANTS.TECHNICAL_GRID.divisions
	const halfSize = SCENE_CONSTANTS.TECHNICAL_GRID.size / 2
	const vertices: number[] = []
	const colors: number[] = []
	const centerLineColor = new Color(SCENE_CONSTANTS.TECHNICAL_GRID.centerLineColor)
	const gridLineColor = new Color(SCENE_CONSTANTS.TECHNICAL_GRID.lineColor)

	for (let index = 0, position = -halfSize; index <= SCENE_CONSTANTS.TECHNICAL_GRID.divisions; index += 1, position += step) {
		vertices.push(-halfSize, 0, position, halfSize, 0, position)
		vertices.push(position, 0, -halfSize, position, 0, halfSize)

		const color = index === center ? centerLineColor : gridLineColor
		for (let vertex = 0; vertex < 4; vertex += 1) color.toArray(colors, colors.length)
	}

	const geometry = new BufferGeometry()
	geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
	return geometry
}

function createTechnicalGridMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexColors: true,
		transparent: true,
		depthWrite: false,
		toneMapped: false,
		uniforms: {
			fadeStart: { value: SCENE_CONSTANTS.TECHNICAL_GRID.fadeStart },
			gridHalfSize: { value: SCENE_CONSTANTS.TECHNICAL_GRID.size / 2 },
		},
		vertexShader: `
			varying vec3 vColor;
			varying vec2 vGridPosition;

			void main() {
				vColor = color;
				vGridPosition = position.xz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float fadeStart;
			uniform float gridHalfSize;
			varying vec3 vColor;
			varying vec2 vGridPosition;

			void main() {
				float edgeDistance = max(abs(vGridPosition.x), abs(vGridPosition.y)) / gridHalfSize;
				float opacity = 1.0 - smoothstep(fadeStart, 1.0, edgeDistance);
				gl_FragColor = vec4(vColor, opacity);
			}
		`,
	})
}
