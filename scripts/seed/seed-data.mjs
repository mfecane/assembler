import { readFileSync } from 'node:fs'

export function loadSeedData() {
	const defaultGraphTemplate = readJson('../data/defaultGraph.json')
	assertDefaultGraphTemplate(defaultGraphTemplate)
	const maxshelfDefaultGraph = readJson('../data/maxshelf/defaultGraph.json')
	const kitchenDefaultGraph = readJson('../data/kitchen/defaultGraph.json')
	assertClientDefaultGraph('maxshelf', maxshelfDefaultGraph)
	assertClientDefaultGraph('kitchen', kitchenDefaultGraph)
	const maxshelfMetadata = readOptionalJson('../data/maxshelf/metadata.json')
	const kitchenMetadata = readOptionalJson('../data/kitchen/metadata.json')
	const maxshelfAssetSeed = readAssetMetadataSeed('maxshelf', maxshelfMetadata)
	const kitchenAssetSeed = readAssetMetadataSeed('kitchen', kitchenMetadata)
	return {
		user: {
			id: '10000000-0000-4000-8000-000000000001',
			email: 'developer@assembler.local',
			password: 'assembler-local',
		},
		modelMetadata: [...maxshelfAssetSeed.metadata, ...kitchenAssetSeed.metadata],
		projects: [
			{
				id: '20000000-0000-4000-8000-000000000001',
				name: 'Seeded MaxShelf project',
				graphDocument: maxshelfDefaultGraph,
			},
			{
				id: '20000000-0000-4000-8000-000000000002',
				name: 'Seeded Kitchen project',
				graphDocument: kitchenDefaultGraph,
			},
		],
	}
}

function readJson(relativePath) {
	return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'))
}

function readOptionalJson(relativePath) {
	try {
		return readJson(relativePath)
	} catch (error) {
		if (error?.code === 'ENOENT') {
			return undefined
		}
		throw error
	}
}

function readAssetMetadataSeed(client, document) {
	if (document === undefined) {
		return { metadata: [] }
	}
	if (!document || typeof document !== 'object' || Array.isArray(document)) {
		throw new Error(
			`The ${client} asset metadata seed must be a JSON object. `
			+ `Received ${JSON.stringify(document)}.`
		)
	}
	const assets = document.assets ?? []
	if (!Array.isArray(assets)) {
		throw new Error(
			`The ${client} asset metadata seed assets field must be an array when provided. `
			+ `Received ${JSON.stringify(document.assets)}.`
		)
	}
	const invalidAssets = assets.filter((asset) => (
		!asset || typeof asset !== 'object' || Array.isArray(asset)
		|| typeof asset.id !== 'string' || asset.id.length === 0
		|| typeof asset.label !== 'string' || asset.label.length === 0
	))
	if (invalidAssets.length > 0) {
		throw new Error(
			`The ${client} asset metadata seed contains assets without non-empty string id and label fields. `
			+ `Invalid assets: ${JSON.stringify(invalidAssets)}.`
		)
	}
	for (const asset of assets) assertStretchMetadata(client, asset)
	return {
		metadata: assets.map((asset) => {
			const { id, label: _label, ...metadata } = asset
			return { model_id: id, metadata: { ...metadata } }
		}),
	}
}

function assertStretchMetadata(client, asset) {
	if (asset.stretchAxes === undefined) return
	if (!Array.isArray(asset.stretchAxes)) {
		throw new Error(
			`The ${client} metadata seed for asset "${asset.id}" must contain a stretchAxes array. `
			+ `Received ${JSON.stringify(asset.stretchAxes)}.`
		)
	}
	for (const [axisIndex, stretchAxis] of asset.stretchAxes.entries()) {
		if (!stretchAxis || typeof stretchAxis !== 'object' || Array.isArray(stretchAxis)
			|| !['x', 'y', 'z'].includes(stretchAxis.axis)
			|| !Array.isArray(stretchAxis.boxes) || stretchAxis.boxes.length === 0) {
			throw new Error(
				`The ${client} metadata seed for asset "${asset.id}" has invalid stretch axis ${axisIndex}. `
				+ 'Expected x/y/z axis and a non-empty boxes array. '
				+ `Received ${JSON.stringify(stretchAxis)}.`
			)
		}
		for (const [boxIndex, box] of stretchAxis.boxes.entries()) {
			if (!box || typeof box !== 'object' || Array.isArray(box)
				|| !Number.isFinite(box.min) || !Number.isFinite(box.max) || box.min >= box.max) {
				throw new Error(
					`The ${client} metadata seed for asset "${asset.id}" has invalid stretch box `
					+ `${boxIndex} on axis ${stretchAxis.axis}. Boxes: ${JSON.stringify(stretchAxis.boxes)}.`
				)
			}
		}
		const boxes = [...stretchAxis.boxes].sort((left, right) => left.min - right.min)
		for (let boxIndex = 1; boxIndex < boxes.length; boxIndex += 1) {
			if (boxes[boxIndex - 1].max <= boxes[boxIndex].min) continue
			throw new Error(
				`The ${client} metadata seed for asset "${asset.id}" has intersecting stretch boxes `
				+ `${boxIndex - 1} and ${boxIndex} on axis ${stretchAxis.axis}. `
				+ `Boxes: ${JSON.stringify(stretchAxis.boxes)}.`
			)
		}
	}
}

function assertDefaultGraphTemplate(document) {
	const graph = document?.graphs?.[0]
	const nodeTypes = graph?.nodes?.map((node) => node.type)
	if (
		!document || typeof document !== 'object' || Array.isArray(document)
		|| document.client !== undefined
		|| document.rootGraphs?.length !== 1
		|| document.enums?.length !== 0
		|| document.graphs?.length !== 1
		|| graph.id !== 'main'
		|| nodeTypes?.filter((type) => type === 'primitive').length !== 1
		|| nodeTypes?.filter((type) => type === 'graphOutput').length !== 1
		|| graph.edges?.length !== 1
	) {
		throw new Error(
			'The default graph template must contain no client, one root, no enums, one graph, one primitive, '
			+ `one graph output, and one edge. Received ${JSON.stringify(document)}.`
		)
	}
}

function assertClientDefaultGraph(client, document) {
	if (
		!document || typeof document !== 'object' || Array.isArray(document)
		|| document.client !== client
		|| !Array.isArray(document.rootGraphs) || document.rootGraphs.length === 0
		|| !Array.isArray(document.enums)
		|| !Array.isArray(document.graphs) || document.graphs.length === 0
	) {
		throw new Error(
			`The ${client} default graph must declare client "${client}" and contain rootGraphs, enums, and graphs. `
			+ `Received ${JSON.stringify(document)}.`
		)
	}
}
