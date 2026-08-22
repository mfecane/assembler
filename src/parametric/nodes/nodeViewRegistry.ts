import {
	Combine,
	Cuboid,
	Grid3X3,
	GitBranch,
	Hash,
	LogOut,
	Network,
	Copy,
	ListFilter,
	ListOrdered,
	Move3d,
	Package,
	Scaling,
	PaintBucket,
	Repeat2,
	Rotate3D,
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
import { ChoiceToMeshMapNode } from '@/parametric/nodes/ChoiceToMeshMapNode'
import { GeometryToggleNode } from '@/parametric/nodes/GeometryToggleNode'
import { MathExpressionNode } from '@/parametric/nodes/MathExpressionNode'
import { Vector3Node } from '@/parametric/nodes/Vector3Node'
import { Vector3ComponentsNode } from '@/parametric/nodes/Vector3ComponentsNode'
import { StretchableAssetNode } from '@/parametric/nodes/StretchableAssetNode'
import { RepeatInputNode } from '@/parametric/nodes/RepeatInputNode'
import { RepeatOutputNode } from '@/parametric/nodes/RepeatOutputNode'
import { RepeatZoneRegionNode } from '@/parametric/nodes/RepeatZoneRegionNode'
import { NumberAggregatorNode } from '@/parametric/nodes/NumberAggregatorNode'
import { GetNthElementNode } from '@/parametric/nodes/GetNthElementNode'
import { RotateAnimationHintNode } from '@/parametric/nodes/RotateAnimationHintNode'

export const nodeViewTypes = {
	primitive: PrimitiveNode,
	parametricInput: InputNode,
	inputReference: InputReferenceNode,
	vector3: Vector3Node,
	vector3Components: Vector3ComponentsNode,
	choiceToScalarMap: ChoiceToScalarMapNode,
	choiceToBooleanMap: ChoiceToBooleanMapNode,
	choiceToVector3Map: ChoiceToVector3MapNode,
	choiceToMeshMap: ChoiceToMeshMapNode,
	geometryToggle: GeometryToggleNode,
	meshAsset: MeshAssetNode,
	stretchableAsset: StretchableAssetNode,
	transform: TransformNode,
	array: ArrayNode,
	sum: SumNode,
	mathExpression: MathExpressionNode,
	applyMaterial: ApplyMaterialNode,
	rotateAnimationHint: RotateAnimationHintNode,
	parametricGroup: GroupNode,
	parametricOutput: OutputNode,
	graphInstance: GraphInstanceNode,
	repeatInput: RepeatInputNode,
	repeatOutput: RepeatOutputNode,
	repeatZoneRegion: RepeatZoneRegionNode,
	numberAggregator: NumberAggregatorNode,
	getNthElement: GetNthElementNode,
}

export type NodeMenuGroup =
	| 'Values'
	| 'Geometry'
	| 'Transform'
	| 'Arrays'
	| 'Logic'
	| 'Appearance'
	| 'Interface'

export interface NodeViewPresentation {
	group: NodeMenuGroup
	description: string
	icon: LucideIcon
}

export const nodeViewPresentation: Record<string, NodeViewPresentation> = {
	input: {
		group: 'Values',
		description: 'Emit a local or exported value',
		icon: Hash,
	},
	inputReference: {
		group: 'Interface',
		description: 'Use an existing graph input',
		icon: Copy,
	},
	vector3: {
		group: 'Logic',
		description: 'Combine X, Y, and Z numbers into a vector',
		icon: Move3d,
	},
	vector3Components: {
		group: 'Logic',
		description: 'Split a vector into X, Y, and Z numbers',
		icon: Move3d,
	},
	choiceToScalarMap: {
		group: 'Logic',
		description: 'Map choices to numbers',
		icon: ListFilter,
	},
	choiceToBooleanMap: {
		group: 'Logic',
		description: 'Map choices to boolean values',
		icon: ToggleLeft,
	},
	choiceToVector3Map: {
		group: 'Logic',
		description: 'Map choices to XYZ vectors',
		icon: Move3d,
	},
	choiceToMeshMap: {
		group: 'Logic',
		description: 'Map choices to separate mesh inputs',
		icon: GitBranch,
	},
	geometryToggle: {
		group: 'Transform',
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
	rotateAnimationHint: {
		group: 'Transform',
		description: 'Mark geometry to rotate in the product preview',
		icon: Rotate3D,
	},
	transform: {
		group: 'Transform',
		description: 'Move, rotate, and scale',
		icon: Move3d,
	},
	array: {
		group: 'Arrays',
		description: 'Repeat geometry along an axis',
		icon: Grid3X3,
	},
	sum: {
		group: 'Logic',
		description: 'Add a constant and number inputs',
		icon: Sigma,
	},
	mathExpression: {
		group: 'Logic',
		description: 'Calculate a numeric expression from indexed inputs',
		icon: SquareFunction,
	},
	group: {
		group: 'Geometry',
		description: 'Combine geometry branches',
		icon: Combine,
	},
	repeatInput: {
		group: 'Logic',
		description: 'Evaluate a geometry branch once per instance',
		icon: Repeat2,
	},
	repeatOutput: {
		group: 'Interface',
		description: 'Collect geometry produced by a repeat zone',
		icon: Repeat2,
	},
	numberAggregator: {
		group: 'Logic',
		description: 'Carry a number between repeat-zone iterations',
		icon: Sigma,
	},
	getNthElement: {
		group: 'Logic',
		description: 'Read one number from a numeric array by index',
		icon: ListOrdered,
	},
	graphInstance: {
		group: 'Interface',
		description: 'Instantiate a graph from this document',
		icon: Network,
	},
	graphOutput: {
		group: 'Interface',
		description: 'Define the assembly output',
		icon: LogOut,
	},
}
