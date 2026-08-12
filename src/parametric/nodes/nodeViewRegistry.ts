import {
	Combine,
	Cuboid,
	Grid3X3,
	GitBranch,
	Hash,
	Layers3,
	LogIn,
	LogOut,
	Network,
	ListFilter,
	Move3d,
	Package,
	PaintBucket,
	Palette,
	Sigma,
	ToggleLeft,
	type LucideIcon,
} from 'lucide-react'
import { PrimitiveNode } from '@/parametric/nodes/PrimitiveNode'
import { ArrayNode } from '@/parametric/nodes/ArrayNode'
import { NumberInputNode } from '@/parametric/nodes/NumberInputNode'
import { SelectorNode } from '@/parametric/nodes/SelectorNode'
import { MeshAssetNode } from '@/parametric/nodes/MeshAssetNode'
import { TransformNode } from '@/parametric/nodes/TransformNode'
import { OutputNode } from '@/parametric/nodes/OutputNode'
import { GroupNode } from '@/parametric/nodes/GroupNode'
import { SumNode } from '@/parametric/nodes/SumNode'
import { ColorNode } from '@/parametric/nodes/ColorNode'
import { MaterialNode } from '@/parametric/nodes/MaterialNode'
import { GraphInputNode } from '@/parametric/nodes/GraphInputNode'
import { GraphInstanceNode } from '@/parametric/nodes/GraphInstanceNode'
import { ChoiceToScalarMapNode } from '@/parametric/nodes/ChoiceToScalarMapNode'
import { ChoiceToVector3MapNode } from '@/parametric/nodes/ChoiceToVector3MapNode'
import { MeshArrayNode } from '@/parametric/nodes/MeshArrayNode'
import { MultiArrayNode } from '@/parametric/nodes/MultiArrayNode'
import { ChoiceToMeshMapNode } from '@/parametric/nodes/ChoiceToMeshMapNode'
import { GeometryToggleNode } from '@/parametric/nodes/GeometryToggleNode'

export const nodeViewTypes = {
	primitive: PrimitiveNode,
	numberInput: NumberInputNode,
	selector: SelectorNode,
	choiceToScalarMap: ChoiceToScalarMapNode,
	choiceToVector3Map: ChoiceToVector3MapNode,
	choiceToMeshMap: ChoiceToMeshMapNode,
	geometryToggle: GeometryToggleNode,
	color: ColorNode,
	meshAsset: MeshAssetNode,
	transform: TransformNode,
	array: ArrayNode,
	meshArray: MeshArrayNode,
	multiArray: MultiArrayNode,
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
	choiceToScalarMap: {
		group: 'Operations',
		description: 'Map choices to numbers',
		icon: ListFilter,
	},
	choiceToVector3Map: {
		group: 'Operations',
		description: 'Map choices to XYZ vectors',
		icon: Move3d,
	},
	choiceToMeshMap: {
		group: 'Operations',
		description: 'Map choices to separate mesh inputs',
		icon: GitBranch,
	},
	geometryToggle: {
		group: 'Operations',
		description: 'Enable or disable a geometry branch',
		icon: ToggleLeft,
	},
	color: {
		group: 'Inputs',
		description: 'Emit a stored RGB color',
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
	meshArray: {
		group: 'Operations',
		description: 'Collect ordered mesh or geometry bundles',
		icon: Layers3,
	},
	multiArray: {
		group: 'Operations',
		description: 'Repeat each mesh bundle by its matching count',
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
	graphInput: {
		group: 'Inputs',
		description: 'Expose an assembly input',
		icon: LogIn,
	},
	graphOutput: {
		group: 'Other',
		description: 'Define the assembly output',
		icon: LogOut,
	},
}
