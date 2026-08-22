import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { SCENE_CONSTANTS } from '@/constants'

export class LayoutFloor {
	public readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>

	public constructor() {
		this.mesh = new Mesh(
			new PlaneGeometry(SCENE_CONSTANTS.LAYOUT_FLOOR.size, SCENE_CONSTANTS.LAYOUT_FLOOR.size),
			new ShaderMaterial({
				transparent: true,
				depthWrite: false,
				uniforms: {
					fadeStart: { value: SCENE_CONSTANTS.LAYOUT_FLOOR.fadeStart },
					fadeEnd: { value: SCENE_CONSTANTS.LAYOUT_FLOOR.fadeEnd },
				},
				vertexShader: `
					varying vec2 vUv;
					void main() {
						vUv = uv;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`,
				fragmentShader: `
					uniform float fadeStart;
					uniform float fadeEnd;
					varying vec2 vUv;
					void main() {
						float radius = length(vUv - vec2(0.5)) * 2.0;
						float opacity = 1.0 - smoothstep(fadeStart, fadeEnd, radius);
						gl_FragColor = vec4(vec3(0.72, 0.72, 0.7), opacity);
						#include <tonemapping_fragment>
						#include <colorspace_fragment>
					}
				`,
			})
		)
		this.mesh.rotation.x = -Math.PI / 2
	}

	public dispose(): void {
		this.mesh.geometry.dispose()
		this.mesh.material.dispose()
	}
}
