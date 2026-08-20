export type NodeColorCategory =
	| 'input'
	| 'geometry'
	| 'appearance'
	| 'operation'
	| 'output'

const nodeColorCategoryByType: Readonly<Record<string, NodeColorCategory>> = {
	input: 'input',
	inputReference: 'input',
	primitive: 'geometry',
	meshAsset: 'geometry',
	stretchableAsset: 'geometry',
	graphInstance: 'geometry',
	applyMaterial: 'appearance',
	choiceToScalarMap: 'operation',
	choiceToBooleanMap: 'operation',
	choiceToVector3Map: 'operation',
	vector3: 'operation',
	vector3Components: 'operation',
	choiceToMeshMap: 'operation',
	geometryToggle: 'operation',
	transform: 'operation',
	array: 'operation',
	meshArray: 'operation',
	multiArray: 'operation',
	group: 'operation',
	sum: 'operation',
	mathExpression: 'operation',
	graphOutput: 'output',
}

export function getNodeColorCategory(type: string): NodeColorCategory {
	const category = nodeColorCategoryByType[type]
	if (!category) {
		throw new Error(
			`Cannot color graph node type "${type}": add it to nodeColorCategoryByType ` +
			'in src/parametric/nodes/nodeColorCoding.ts'
		)
	}
	return category
}
