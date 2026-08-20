import {
	Combine,
	Cuboid,
	Grid3X3,
	GitBranch,
	Hash,
	Layers3,
	LogOut,
	Network,
	Copy,
	ListFilter,
	Move3d,
	Package,
	Scaling,
	PaintBucket,
	Sigma,
	SquareFunction,
	ToggleLeft,
	type LucideIcon,
} from 'lucide-react'
import { PrimitiveNode } from '@/parametric/nodes/PrimitiveNode'
import { ArrayNode } from '@/parametric/nodes/ArrayNode'
import { MeshAssetNode } from '@/parametric/nodes/MeshAssetNode'
import { TransformNode } from '@/parametric/nodes/TransformNode'
import { OutputNode } from '@/parametric/nodes/OutputNode'
import { GroupNode } from '@/parametric/nodes/GroupNode'
import { SumNode } from '@/parametric/nodes/SumNode'
import { ApplyMaterialNode } from '@/parametric/nodes/ApplyMaterialNode'
import { InputNode } from '@/parametric/nodes/InputNode'
import { InputReferenceNode } from '@/parametric/nodes/InputReferenceNode'
import { GraphInstanceNode } from '@/parametric/nodes/GraphInstanceNode'
import { ChoiceToScalarMapNode } from '@/parametric/nodes/ChoiceToScalarMapNode'
import { ChoiceToBooleanMapNode } from '@/parametric/nodes/ChoiceToBooleanMapNode'
import { ChoiceToVector3MapNode } from '@/parametric/nodes/ChoiceToVector3MapNode'
import { MeshArrayNode } from '@/parametric/nodes/MeshArrayNode'
import { MultiArrayNode } from '@/parametric/nodes/MultiArrayNode'
import { ChoiceToMeshMapNode } from '@/parametric/nodes/ChoiceToMeshMapNode'
import { GeometryToggleNode } from '@/parametric/nodes/GeometryToggleNode'
import { MathExpressionNode } from '@/parametric/nodes/MathExpressionNode'
import { Vector3Node } from '@/parametric/nodes/Vector3Node'
import { Vector3ComponentsNode } from '@/parametric/nodes/Vector3ComponentsNode'
import { StretchableAssetNode } from '@/parametric/nodes/StretchableAssetNode'
import { PinNode } from '@/parametric/nodes/PinNode'

export const nodeViewTypes = {
	primitive: PrimitiveNode,
	parametricInput: InputNode,
	inputReference: InputReferenceNode,
	vector3: Vector3Node,
	vector3Components: Vector3ComponentsNode,
	pin: PinNode,
	choiceToScalarMap: ChoiceToScalarMapNode,
	choiceToBooleanMap: ChoiceToBooleanMapNode,
	choiceToVector3Map: ChoiceToVector3MapNode,
	choiceToMeshMap: ChoiceToMeshMapNode,
	geometryToggle: GeometryToggleNode,
	meshAsset: MeshAssetNode,
	stretchableAsset: StretchableAssetNode,
	transform: TransformNode,
	array: ArrayNode,
	meshArray: MeshArrayNode,
	multiArray: MultiArrayNode,
	sum: SumNode,
	mathExpression: MathExpressionNode,
	applyMaterial: ApplyMaterialNode,
	parametricGroup: GroupNode,
	parametricOutput: OutputNode,
	graphInstance: GraphInstanceNode,
}

export type NodeMenuGroup = 'Inputs' | 'Geometry' | 'Appearance' | 'Operations' | 'Other'

export interface NodeViewPresentation {
	group: NodeMenuGroup
	description: string
	icon: LucideIcon
}

export const nodeViewPresentation: Record<string, NodeViewPresentation> = {
	input: {
		group: 'Inputs',
		description: 'Emit a local or exported value',
		icon: Hash,
	},
	inputReference: {
		group: 'Inputs',
		description: 'Use an existing graph input',
		icon: Copy,
	},
	vector3: {
		group: 'Operations',
		description: 'Combine X, Y, and Z numbers into a vector',
		icon: Move3d,
	},
	vector3Components: {
		group: 'Operations',
		description: 'Split a vector into X, Y, and Z numbers',
		icon: Move3d,
	},
	choiceToScalarMap: {
		group: 'Operations',
		description: 'Map choices to numbers',
		icon: ListFilter,
	},
	choiceToBooleanMap: {
		group: 'Operations',
		description: 'Map choices to boolean values',
		icon: ToggleLeft,
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
	stretchableAsset: {
		group: 'Geometry',
		description: 'Stretch one repository mesh to target dimensions',
		icon: Scaling,
	},
	applyMaterial: {
		group: 'Appearance',
		description: 'Assign a material instance to geometry',
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
	mathExpression: {
		group: 'Operations',
		description: 'Calculate a numeric expression from indexed inputs',
		icon: SquareFunction,
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
	graphOutput: {
		group: 'Other',
		description: 'Define the assembly output',
		icon: LogOut,
	},
}
