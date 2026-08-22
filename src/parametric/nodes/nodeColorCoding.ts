import { InputGraphNode, type GraphNode } from '@/parametric/model/GraphNode'

export type NodeColorCategory =
	| 'localInput'
	| 'exportedInput'
	| 'reference'
	| 'geometry'
	| 'appearance'
	| 'transform'
	| 'array'
	| 'logic'
	| 'output'

const nodeColorCategoryByType: Readonly<Record<string, NodeColorCategory>> = {
	inputReference: 'reference',
	primitive: 'geometry',
	meshAsset: 'geometry',
	stretchableAsset: 'geometry',
	graphInstance: 'geometry',
	group: 'geometry',
	applyMaterial: 'appearance',
	transform: 'transform',
	geometryToggle: 'transform',
	rotateAnimationHint: 'transform',
	array: 'array',
	choiceToScalarMap: 'logic',
	choiceToBooleanMap: 'logic',
	choiceToVector3Map: 'logic',
	choiceToMeshMap: 'logic',
	vector3: 'logic',
	vector3Components: 'logic',
	repeatInput: 'logic',
	numberAggregator: 'logic',
	getNthElement: 'logic',
	sum: 'logic',
	mathExpression: 'logic',
	repeatOutput: 'output',
	graphOutput: 'output',
}

export function getNodeColorCategory(node: GraphNode): NodeColorCategory {
	if (node instanceof InputGraphNode) {
		return node.isExported() ? 'exportedInput' : 'localInput'
	}
	const category = nodeColorCategoryByType[node.type]
	if (!category) {
		throw new Error(
			`Cannot color graph node type "${node.type}": add it to nodeColorCategoryByType `
			+ 'in src/parametric/nodes/nodeColorCoding.ts'
		)
	}
	return category
}
