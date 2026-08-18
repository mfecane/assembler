import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const user = {
	id: '10000000-0000-4000-8000-000000000001',
	email: 'developer@assembler.local',
	password: 'assembler-local',
}
const projectId = '20000000-0000-4000-8000-000000000001'
const projectName = 'Seeded MaxShelf configurator'
const kitchenProjectId = '20000000-0000-4000-8000-000000000002'
const kitchenProjectName = 'Seeded Kitchen configurator'
const defaultGraph = JSON.parse(
	readFileSync(new URL('../src/data/defaultGraph.json', import.meta.url), 'utf8')
)
if (defaultGraph.client !== 'maxshelf') {
	throw new Error(
		'The seeded MaxShelf graph must declare client "maxshelf". '
		+ `Received ${JSON.stringify(defaultGraph.client)}.`
	)
}
const kitchenDefaultGraph = JSON.parse(
	readFileSync(new URL('../src/data/kitchen/defaultGraph.json', import.meta.url), 'utf8')
)
if (
	kitchenDefaultGraph.client !== 'kitchen'
	|| !Array.isArray(kitchenDefaultGraph.rootGraphs)
	|| kitchenDefaultGraph.rootGraphs.length === 0
	|| !Array.isArray(kitchenDefaultGraph.enums)
	|| !Array.isArray(kitchenDefaultGraph.graphs)
	|| kitchenDefaultGraph.graphs.length === 0
) {
	throw new Error(
		'The Kitchen default graph must declare client "kitchen" and contain rootGraphs, enums, and graphs. '
		+ `Received top-level data ${JSON.stringify(kitchenDefaultGraph)}.`
	)
}
if (!Array.isArray(defaultGraph.enums) || defaultGraph.enums.length === 0) {
	throw new Error(
		'The default graph seed must contain at least one document-level enum definition. '
		+ `Received top-level keys: ${JSON.stringify(Object.keys(defaultGraph))}.`
	)
}
if (!Array.isArray(defaultGraph.graphs) || defaultGraph.graphs.length === 0) {
	throw new Error(
		'The default graph seed must contain at least one graph definition. '
		+ `Received graphs: ${JSON.stringify(defaultGraph.graphs)}.`
	)
}
if (!Array.isArray(defaultGraph.rootGraphs) || defaultGraph.rootGraphs.length === 0) {
	throw new Error(
		'The default graph seed must contain at least one root graph configuration. '
		+ `Received rootGraphs: ${JSON.stringify(defaultGraph.rootGraphs)}.`
	)
}
const graphIds = new Set(defaultGraph.graphs.map((graph) => graph.id))
const rootGraphIds = defaultGraph.rootGraphs.map((rootGraph) => rootGraph.graphId)
const invalidRootGraphs = defaultGraph.rootGraphs.filter((rootGraph, index) => (
	typeof rootGraph.graphId !== 'string'
	|| !graphIds.has(rootGraph.graphId)
	|| rootGraphIds.indexOf(rootGraph.graphId) !== index
	|| !rootGraph.inputValues
	|| !Array.isArray(rootGraph.configurationPanel?.controls)
))
if (invalidRootGraphs.length > 0) {
	throw new Error(
		'The default graph seed contains invalid root graph configurations. '
		+ 'Every root must reference one unique graph and contain inputValues plus a configuration panel; '
		+ `received invalid roots ${JSON.stringify(invalidRootGraphs)} from root ids ${JSON.stringify(rootGraphIds)} `
		+ `and graph ids ${JSON.stringify([...graphIds])}.`
	)
}
const enumDefinitions = new Map(defaultGraph.enums.map((definition) => [definition.id, definition]))
const enumInputs = defaultGraph.graphs.flatMap((graph) => graph.inputs
	.filter((input) => input.valueType === 'enum')
	.map((input) => ({ graphId: graph.id, input })))
const invalidEnumInputs = enumInputs.filter(({ input }) => {
	const options = enumDefinitions.get(input.enumId)?.options
	return !Array.isArray(options)
		|| options.length === 0
		|| !Number.isInteger(input.defaultValue)
		|| input.defaultValue < 0
		|| input.defaultValue >= options.length
})
const invalidRootEnumValues = defaultGraph.rootGraphs.flatMap((rootGraph) => {
	const graph = defaultGraph.graphs.find((candidate) => candidate.id === rootGraph.graphId)
	return graph.inputs.flatMap((input) => {
		if (input.valueType !== 'enum' || !(input.id in rootGraph.inputValues)) return []
		const options = enumDefinitions.get(input.enumId)?.options ?? []
		const value = rootGraph.inputValues[input.id]
		return Number.isInteger(value) && value >= 0 && value < options.length
			? []
			: [{ graphId: graph.id, inputId: input.id, value, optionCount: options.length }]
	})
})
const invalidEnumMappings = defaultGraph.graphs.flatMap((graph) => graph.nodes.flatMap((node) => {
	const entries = node.type === 'choiceToMeshMap'
		? node.data.mappings
		: node.type === 'choiceToScalarMap' || node.type === 'choiceToVector3Map'
			? node.data.mappings
			: undefined
	if (!entries) return []
	return Array.isArray(entries) && entries.every((entry) => (
		Number.isInteger(entry.enumIndex) && entry.enumIndex >= 0 && !('enumValue' in entry)
	)) ? [] : [{ graphId: graph.id, nodeId: node.id, entries }]
}))
const invalidVectorMappings = defaultGraph.graphs.flatMap((graph) => graph.nodes.flatMap((node) => (
	node.type !== 'choiceToVector3Map'
		? []
		: node.data.mappings.every((mapping) => (
			mapping.value
			&& typeof mapping.value === 'object'
			&& Number.isFinite(mapping.value.x)
			&& Number.isFinite(mapping.value.y)
			&& Number.isFinite(mapping.value.z)
		))
			? []
			: [{ graphId: graph.id, nodeId: node.id, mappings: node.data.mappings }]
)))
if (
	invalidEnumInputs.length > 0
	|| invalidRootEnumValues.length > 0
	|| invalidEnumMappings.length > 0
	|| invalidVectorMappings.length > 0
) {
	throw new Error(
		'The default graph seed contains invalid indexed choice data. Choice defaults, root values, '
		+ 'scalar, vector, and mesh mappings must use non-negative option indices. '
		+ `Invalid inputs: ${JSON.stringify(invalidEnumInputs)}. Invalid root values: `
		+ `${JSON.stringify(invalidRootEnumValues)}. Invalid mappings: ${JSON.stringify(invalidEnumMappings)}. `
		+ `Invalid vectors: ${JSON.stringify(invalidVectorMappings)}.`
	)
}
const rgbColorPattern = /^#[0-9a-f]{6}$/i
const colorInputs = defaultGraph.graphs.flatMap((graph) => graph.inputs
	.filter((input) => input.valueType === 'color')
	.map((input) => ({ graphId: graph.id, input })))
const invalidColorInputs = colorInputs.filter(({ input }) => (
	'options' in input
	|| typeof input.defaultValue !== 'string'
	|| !rgbColorPattern.test(input.defaultValue)
))
if (invalidColorInputs.length > 0) {
	throw new Error(
		'The default graph seed contains color inputs with local options or invalid RGB defaults. '
		+ `Every color input must store only a #RRGGBB default; received ${JSON.stringify(invalidColorInputs)}.`
	)
}
const colorControls = defaultGraph.rootGraphs.flatMap((rootGraph) => (
	rootGraph.configurationPanel.controls
		.filter((control) => control.type === 'color')
		.map((control) => ({ graphId: rootGraph.graphId, control }))
))
const invalidColorControls = colorControls.filter(({ control }) => (
	!Array.isArray(control.options)
	|| control.options.length === 0
	|| new Set(control.options).size !== control.options.length
	|| control.options.some((color) => typeof color !== 'string' || !rgbColorPattern.test(color))
))
if (invalidColorControls.length > 0) {
	throw new Error(
		'The default graph seed contains invalid configuration color palettes. '
		+ 'Every color control requires a non-empty, unique list of #RRGGBB colors; '
		+ `received ${JSON.stringify(invalidColorControls)}.`
	)
}
const numberArrayInputs = defaultGraph.graphs.flatMap((graph) => graph.inputs
	.filter((input) => input.valueType === 'numberArray')
	.map((input) => ({ graphId: graph.id, input })))
const invalidNumberArrayInputs = numberArrayInputs.filter(({ input }) => (
	!Array.isArray(input.defaultValue)
	|| input.defaultValue.some((value) => (
		typeof value !== 'number' || !Number.isFinite(value) || value < 0
	))
))
const invalidNumberArrayControls = defaultGraph.rootGraphs.flatMap((rootGraph) => (
	rootGraph.configurationPanel.controls
		.filter((control) => control.type === 'numberArray')
		.map((control) => ({ graphId: rootGraph.graphId, control }))
)).filter(({ control }) => (
	!Array.isArray(control.labels)
	|| control.labels.length === 0
	|| control.labels.some((label) => typeof label !== 'string' || !label.trim())
	|| typeof control.total !== 'number'
	|| !Number.isFinite(control.total)
	|| control.total < 0
	|| typeof control.step !== 'number'
	|| !Number.isFinite(control.step)
	|| control.step <= 0
))
if (invalidNumberArrayInputs.length > 0 || invalidNumberArrayControls.length > 0) {
	throw new Error(
		'The default graph seed contains invalid number-array inputs or configuration controls. '
		+ 'Defaults must contain non-negative finite numbers; controls require labels, a non-negative '
		+ `total, and a positive step. Invalid inputs: ${JSON.stringify(invalidNumberArrayInputs)}. `
		+ `Invalid controls: ${JSON.stringify(invalidNumberArrayControls)}.`
	)
}
const nodeTypes = defaultGraph.graphs.flatMap((graph) => graph.nodes.map((node) => node.type))
if (
	!nodeTypes.includes('meshArray')
	|| !nodeTypes.includes('multiArray')
	|| !nodeTypes.includes('choiceToMeshMap')
	|| !nodeTypes.includes('geometryToggle')
) {
	throw new Error(
		'The default MaxShelf seed must exercise Mesh Array, Multi Array, Choice to Mesh, '
		+ 'and Geometry Toggle. '
		+ `Received node types ${JSON.stringify([...new Set(nodeTypes)])}.`
	)
}
const apiUrl = process.env.SUPABASE_INTERNAL_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!apiUrl || !secretKey) {
	throw new Error('The seed service is missing its Supabase configuration.')
}
const admin = createClient(apiUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false },
})

const { data: existingUsers, error: listUsersError } = await admin.auth.admin.listUsers({
	page: 1,
	perPage: 1000,
})
if (listUsersError) throw listUsersError

const existingUser = existingUsers.users.find(
	(candidate) => candidate.id === user.id || candidate.email === user.email
)
const ownerId = existingUser?.id ?? user.id
if (existingUser) {
	const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
		email: user.email,
		password: user.password,
		email_confirm: true,
	})
	if (error) throw error
} else {
	const { error } = await admin.auth.admin.createUser({
		id: user.id,
		email: user.email,
		password: user.password,
		email_confirm: true,
	})
	if (error) throw error
}

const { error: projectError } = await admin
	.from('projects')
	.upsert(
		{
			id: projectId,
			user_id: ownerId,
			user_email: user.email,
			name: projectName,
			graph_document: defaultGraph,
		},
		{ onConflict: 'id' }
	)

if (projectError) {
	throw new Error(
		`Failed to seed project "${projectName}" (${projectId}) for `
		+ `local user "${user.email}" (${ownerId}): ${projectError.message}`,
		{ cause: projectError }
	)
}

const { error: kitchenProjectError } = await admin
	.from('projects')
	.upsert(
		{
			id: kitchenProjectId,
			user_id: ownerId,
			user_email: user.email,
			name: kitchenProjectName,
			graph_document: kitchenDefaultGraph,
		},
		{ onConflict: 'id' }
	)

if (kitchenProjectError) {
	throw new Error(
		`Failed to seed project "${kitchenProjectName}" (${kitchenProjectId}) for `
		+ `local user "${user.email}" (${ownerId}): ${kitchenProjectError.message}`,
		{ cause: kitchenProjectError }
	)
}

console.log(`Seeded ${user.email} and the default MaxShelf and Kitchen configurator projects.`)
