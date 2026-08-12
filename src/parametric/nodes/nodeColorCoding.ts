export type NodeColorCategory =
	| 'input'
	| 'geometry'
	| 'appearance'
	| 'operation'
	| 'output'

const nodeColorCategoryByType: Readonly<Record<string, NodeColorCategory>> = {
	numberInput: 'input',
	selector: 'input',
	color: 'input',
	graphInput: 'input',
	primitive: 'geometry',
	meshAsset: 'geometry',
	graphInstance: 'geometry',
	material: 'appearance',
	choiceToScalarMap: 'operation',
	choiceToVector3Map: 'operation',
	choiceToMeshMap: 'operation',
	geometryToggle: 'operation',
	transform: 'operation',
	array: 'operation',
	meshArray: 'operation',
	multiArray: 'operation',
	group: 'operation',
	sum: 'operation',
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
