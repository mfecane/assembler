import { RepeatInputGraphNode, RepeatOutputGraphNode, type GraphNode } from '@/parametric/model/GraphNode'
import {
	RectangleBoundsCalculator,
	type Rectangle,
} from '@/parametric/model/RectangleBoundsCalculator'

const NODE_CENTER_X = 96
const NODE_CENTER_Y = 64
const DEFAULT_NODE_WIDTH = 192
const DEFAULT_NODE_HEIGHT = 128
const PADDING = 32
const MINIMUM_WIDTH = 320
const MINIMUM_HEIGHT = 320

export interface GraphNodeDimensions {
	width: number
	height: number
}

export interface RepeatZoneBounds extends Rectangle {}

export class RepeatZone {
	private readonly boundsCalculator = new RectangleBoundsCalculator()

	public static findOwner(node: GraphNode, nodes: Iterable<GraphNode>): RepeatZone | undefined {
		const graphNodes = [...nodes]
		const nodesById = new Map(graphNodes.map((candidate) => [candidate.id, candidate]))
		return graphNodes
			.flatMap((candidate): RepeatZone[] => {
				if (!(candidate instanceof RepeatOutputGraphNode)) return []
				const input = nodesById.get(candidate.getRepeatInputId())
				return input instanceof RepeatInputGraphNode ? [new RepeatZone(input, candidate)] : []
			})
			.filter((zone) => zone.contains(node))
			.sort((left, right) => left.getArea() - right.getArea())[0]
	}

	public constructor(
		public readonly input: RepeatInputGraphNode,
		public readonly output: RepeatOutputGraphNode
	) {}

	public getBounds(
		nodes: Iterable<GraphNode> = [],
		nodeDimensions: ReadonlyMap<string, GraphNodeDimensions> = new Map()
	): RepeatZoneBounds {
		const zoneNodes = [
			this.input,
			this.output,
			...[...nodes].filter((node) => this.contains(node)),
		]
		const nodeRectangles = zoneNodes.map((node) => {
			const position = node.getPosition()
			const dimensions = nodeDimensions.get(node.id)
			return {
				x: position.x,
				y: position.y,
				width: dimensions?.width ?? DEFAULT_NODE_WIDTH,
				height: dimensions?.height ?? DEFAULT_NODE_HEIGHT,
			}
		})
		return this.boundsCalculator.calculate(
			nodeRectangles,
			PADDING,
			MINIMUM_WIDTH,
			MINIMUM_HEIGHT
		)
	}

	public getArea(): number {
		const bounds = this.getBounds()
		return bounds.width * bounds.height
	}

	public contains(node: GraphNode): boolean {
		if (node.id === this.input.id || node.id === this.output.id) return false
		const inputPosition = this.input.getPosition()
		const outputPosition = this.output.getPosition()
		const bounds = this.getBounds()
		const position = node.getPosition()
		const centerX = position.x + NODE_CENTER_X
		const centerY = position.y + NODE_CENTER_Y
		const leftBoundary = Math.min(inputPosition.x, outputPosition.x) + NODE_CENTER_X
		const rightBoundary = Math.max(inputPosition.x, outputPosition.x) + NODE_CENTER_X
		return (
			centerX > leftBoundary &&
			centerX < rightBoundary &&
			centerY > bounds.y &&
			centerY < bounds.y + bounds.height
		)
	}

	public getInternalNodeIds(nodes: Iterable<GraphNode>): ReadonlySet<string> {
		return new Set([...nodes].filter((node) => this.contains(node)).map((node) => node.id))
	}
}
