import {
	Boxes,
	Combine,
	Cuboid,
	Grid3X3,
	Hash,
	Network,
	ListFilter,
	Move3d,
	Package,
	PaintBucket,
	Palette,
	Sigma,
	type LucideIcon,
} from 'lucide-react'
import { PrimitiveNode } from '@/parametric/nodes/PrimitiveNode'
import { ArrayNode } from '@/parametric/nodes/ArrayNode'
import { NumberInputNode } from '@/parametric/nodes/NumberInputNode'
import { SelectorNode } from '@/parametric/nodes/SelectorNode'
import { MeshAssetNode } from '@/parametric/nodes/MeshAssetNode'
import { MeshSelectorNode } from '@/parametric/nodes/MeshSelectorNode'
import { TransformNode } from '@/parametric/nodes/TransformNode'
import { OutputNode } from '@/parametric/nodes/OutputNode'
import { GroupNode } from '@/parametric/nodes/GroupNode'
import { SumNode } from '@/parametric/nodes/SumNode'
import { ColorNode } from '@/parametric/nodes/ColorNode'
import { MaterialNode } from '@/parametric/nodes/MaterialNode'
import { GraphInputNode } from '@/parametric/nodes/GraphInputNode'
import { GraphInstanceNode } from '@/parametric/nodes/GraphInstanceNode'

export const nodeViewTypes = {
	primitive: PrimitiveNode,
	numberInput: NumberInputNode,
	selector: SelectorNode,
	color: ColorNode,
	meshAsset: MeshAssetNode,
	meshSelector: MeshSelectorNode,
	transform: TransformNode,
	array: ArrayNode,
	sum: SumNode,
	material: MaterialNode,
	parametricGroup: GroupNode,
	parametricOutput: OutputNode,
	graphInput: GraphInputNode,
	graphInstance: GraphInstanceNode,
}

export type NodeMenuGroup = 'Inputs' | 'Geometry' | 'Appearance' | 'Operations' | 'Other'

export interface NodeViewPresentation {
	group: NodeMenuGroup
	description: string
	icon: LucideIcon
}

export const nodeViewPresentation: Record<string, NodeViewPresentation> = {
	numberInput: {
		group: 'Inputs',
		description: 'Emit a stored numeric value',
		icon: Hash,
	},
	selector: {
		group: 'Inputs',
		description: 'Emit a stored choice',
		icon: ListFilter,
	},
	color: {
		group: 'Inputs',
		description: 'Emit a stored preset color',
		icon: Palette,
	},
	primitive: {
		group: 'Geometry',
		description: 'Create basic geometry',
		icon: Cuboid,
	},
	meshAsset: {
		group: 'Geometry',
		description: 'Place one repository mesh',
		icon: Package,
	},
	meshSelector: {
		group: 'Geometry',
		description: 'Map enum values to meshes',
		icon: Boxes,
	},
	material: {
		group: 'Appearance',
		description: 'Apply a standard material',
		icon: PaintBucket,
	},
	transform: {
		group: 'Operations',
		description: 'Move, rotate, and scale',
		icon: Move3d,
	},
	array: {
		group: 'Operations',
		description: 'Repeat geometry along an axis',
		icon: Grid3X3,
	},
	sum: {
		group: 'Operations',
		description: 'Add a constant and number inputs',
		icon: Sigma,
	},
	group: {
		group: 'Operations',
		description: 'Combine geometry branches',
		icon: Combine,
	},
	graphInstance: {
		group: 'Geometry',
		description: 'Instantiate a graph from this document',
		icon: Network,
	},
}
