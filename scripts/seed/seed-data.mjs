import { readFileSync } from 'node:fs'

const MIN_MODEL_TEXEL_SIZE_RATIO = 0.01
const MAX_MODEL_TEXEL_SIZE_RATIO = 10

export function loadSeedData() {
	const defaultGraphTemplate = readJson('../data/defaultGraph.json')
	assertDefaultGraphTemplate(defaultGraphTemplate)
	const kitchenDefaultGraph = normalizeSeedGraph(readJson('../data/kitchen/project.json'))
	assertClientDefaultGraph('kitchen', kitchenDefaultGraph)
	const kitchenMetadata = readOptionalJson('../data/kitchen/metadata.json')
	const kitchenAssetSeed = readAssetMetadataSeed('kitchen', kitchenMetadata)
	return {
		user: {
			id: '10000000-0000-4000-8000-000000000001',
			email: 'developer@assembler.local',
			password: 'assembler-local',
		},
		modelMetadata: kitchenAssetSeed.metadata,
		projects: [
			{
				id: '20000000-0000-4000-8000-000000000002',
				name: 'Kitchen project',
				graphDocument: kitchenDefaultGraph,
			},
		],
	}
}

const LEGACY_WIDGET_TYPES = new Set([
	'uiNumberWidget',
	'uiSliderWidget',
	'uiChoiceWidget',
	'uiMaterialWidget',
	'uiSwitchWidget',
	'uiNumberArrayWidget',
	'uiGroup',
	'uiOutput',
])

function normalizeSeedGraph(document) {
	const rootGraphs = new Map(document.rootGraphs.map((root) => [root.graphId, root]))
	for (const graph of document.graphs) {
		const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
		const legacyNodes = graph.nodes.filter((node) => LEGACY_WIDGET_TYPES.has(node.type))
		for (const widget of legacyNodes) {
			if (!widget.type.endsWith('Widget')) continue
			const valueEdge = graph.edges.find((edge) => (
				edge.sourceNodeId === widget.id && edge.sourcePort === 'value'
			))
			const input = valueEdge && nodesById.get(valueEdge.targetNodeId)
			if (!input || input.type !== 'input') continue
			input.data.value = widget.data.value
			input.data.exported = true
			if (widget.data.enumId) input.data.enumId = widget.data.enumId
			const definition = {
				id: input.id,
				label: input.name || widget.name || input.id,
				valueType: input.data.valueType,
				defaultValue: input.data.value,
				...(input.data.enumId ? { enumId: input.data.enumId } : {}),
			}
			const existing = graph.inputs.find((candidate) => candidate.id === input.id)
			if (existing) Object.assign(existing, definition)
			else graph.inputs.push(definition)
			const rootGraph = rootGraphs.get(graph.id)
			if (!rootGraph) continue
			rootGraph.inputValues[input.id] = input.data.value
			const controls = rootGraph.configurationPanel.controls
			if (!controls.some((control) => control.inputId === input.id)) {
				controls.push(createSeedConfigurationControl(input, widget))
			}
		}
		const removedNodeIds = new Set(legacyNodes.map((node) => node.id))
		graph.nodes = graph.nodes.filter((node) => !removedNodeIds.has(node.id))
		graph.edges = graph.edges.filter((edge) => (
			!removedNodeIds.has(edge.sourceNodeId) && !removedNodeIds.has(edge.targetNodeId)
		))
	}
	return document
}

function createSeedConfigurationControl(input, widget) {
	const base = {
		id: `${input.id}-control`,
		inputId: input.id,
		label: input.name || widget.name || input.id,
	}
	if (widget.type === 'uiSliderWidget') {
		return { ...base, type: 'slider', min: widget.data.min, max: widget.data.max, step: widget.data.step }
	}
	if (widget.type === 'uiNumberArrayWidget') {
		const values = Array.isArray(widget.data.value) ? widget.data.value : [0]
		return {
			...base,
			type: 'numberArray',
			labels: widget.data.labels ?? values.map((_, index) => `Value ${index + 1}`),
			total: widget.data.total ?? Math.max(1, values.reduce((total, value) => total + value, 0)),
			step: widget.data.step ?? 1,
		}
	}
	if (widget.type === 'uiChoiceWidget') return { ...base, type: 'select' }
	if (widget.type === 'uiMaterialWidget') return { ...base, type: 'material' }
	if (widget.type === 'uiSwitchWidget') return { ...base, type: 'switch' }
	return { ...base, type: 'number', step: widget.data.step ?? 0.1 }
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
			`The ${client} asset metadata seed must be a JSON object. ` + `Received ${JSON.stringify(document)}.`
		)
	}
	const assets = document.assets ?? []
	if (!Array.isArray(assets)) {
		throw new Error(
			`The ${client} asset metadata seed assets field must be an array when provided. ` +
				`Received ${JSON.stringify(document.assets)}.`
		)
	}
	const invalidAssets = assets.filter(
		(asset) =>
			!asset ||
			typeof asset !== 'object' ||
			Array.isArray(asset) ||
			typeof asset.id !== 'string' ||
			asset.id.length === 0 ||
			typeof asset.label !== 'string' ||
			asset.label.length === 0
	)
	if (invalidAssets.length > 0) {
		throw new Error(
			`The ${client} asset metadata seed contains assets without non-empty string id and label fields. ` +
				`Invalid assets: ${JSON.stringify(invalidAssets)}.`
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
	if (
		asset.texelSizeRatio !== undefined
		&& (
			!Number.isFinite(asset.texelSizeRatio)
			|| asset.texelSizeRatio < MIN_MODEL_TEXEL_SIZE_RATIO
			|| asset.texelSizeRatio > MAX_MODEL_TEXEL_SIZE_RATIO
		)
	) {
		throw new Error(
			`The ${client} metadata seed for asset "${asset.id}" has invalid texelSizeRatio `
			+ `${JSON.stringify(asset.texelSizeRatio)}. Expected a finite UV-units-per-model-unit ratio from `
			+ `${MIN_MODEL_TEXEL_SIZE_RATIO} to ${MAX_MODEL_TEXEL_SIZE_RATIO}.`
		)
	}
	if (asset.stretchAxes === undefined) return
	if (!Array.isArray(asset.stretchAxes)) {
		throw new Error(
			`The ${client} metadata seed for asset "${asset.id}" must contain a stretchAxes array. ` +
				`Received ${JSON.stringify(asset.stretchAxes)}.`
		)
	}
	for (const [axisIndex, stretchAxis] of asset.stretchAxes.entries()) {
		if (
			!stretchAxis ||
			typeof stretchAxis !== 'object' ||
			Array.isArray(stretchAxis) ||
			!['x', 'y', 'z'].includes(stretchAxis.axis) ||
			!Array.isArray(stretchAxis.boxes) ||
			stretchAxis.boxes.length === 0
		) {
			throw new Error(
				`The ${client} metadata seed for asset "${asset.id}" has invalid stretch axis ${axisIndex}. ` +
					'Expected x/y/z axis and a non-empty boxes array. ' +
					`Received ${JSON.stringify(stretchAxis)}.`
			)
		}
		for (const [boxIndex, box] of stretchAxis.boxes.entries()) {
			if (
				!box ||
				typeof box !== 'object' ||
				Array.isArray(box) ||
				!Number.isFinite(box.min) ||
				!Number.isFinite(box.max) ||
				box.min >= box.max
			) {
				throw new Error(
					`The ${client} metadata seed for asset "${asset.id}" has invalid stretch box ` +
					`${boxIndex} on axis ${stretchAxis.axis}. Box boundaries must be finite numbers with ` +
						`min below max. They are rounded to three decimals when loaded. ` +
						`Boxes: ${JSON.stringify(stretchAxis.boxes)}.`
				)
			}
		}
		const boxes = [...stretchAxis.boxes].sort((left, right) => left.min - right.min)
		for (let boxIndex = 1; boxIndex < boxes.length; boxIndex += 1) {
			if (boxes[boxIndex - 1].max <= boxes[boxIndex].min) continue
			throw new Error(
				`The ${client} metadata seed for asset "${asset.id}" has intersecting stretch boxes ` +
					`${boxIndex - 1} and ${boxIndex} on axis ${stretchAxis.axis}. ` +
					`Boxes: ${JSON.stringify(stretchAxis.boxes)}.`
			)
		}
	}
}

function assertDefaultGraphTemplate(document) {
	const graph = document?.graphs?.[0]
	const nodeTypes = graph?.nodes?.map((node) => node.type)
	if (
		!document ||
		typeof document !== 'object' ||
		Array.isArray(document) ||
		document.client !== undefined ||
		document.rootGraphs?.length !== 1 ||
		!document.rootGraphs.every(hasConfigurationPanel) ||
		document.enums?.length !== 0 ||
		document.graphs?.length !== 1 ||
		!hasProductData(document.products) ||
		graph.id !== 'main' ||
		nodeTypes?.filter((type) => type === 'primitive').length !== 1 ||
		nodeTypes?.filter((type) => type === 'graphOutput').length !== 1
	) {
		throw new Error(
			'The default graph template must contain no client, product instance data, one root, no ' +
			'enums, one graph, one primitive, one graph output, and one root configuration panel. ' +
				`Received ${JSON.stringify(document)}.`
		)
	}
}

function assertClientDefaultGraph(client, document) {
	if (
		!document ||
		typeof document !== 'object' ||
		Array.isArray(document) ||
		document.client !== client ||
		!Array.isArray(document.rootGraphs) ||
		document.rootGraphs.length === 0 ||
		!document.rootGraphs.every(hasConfigurationPanel) ||
		!hasProductData(document.products) ||
		!Array.isArray(document.enums) ||
		!Array.isArray(document.graphs) ||
		document.graphs.length === 0
	) {
		throw new Error(
			`The ${client} default graph must declare client "${client}" and contain product instance data, ` +
				`rootGraphs, enums, and graphs. ` +
				`Received ${JSON.stringify(document)}.`
		)
	}
}

function hasConfigurationPanel(rootGraph) {
	const panel = rootGraph?.configurationPanel
	return Boolean(
		panel
		&& typeof panel === 'object'
		&& !Array.isArray(panel)
		&& Array.isArray(panel.controls)
		&& Array.isArray(panel.templates)
	)
}

function hasProductData(productData) {
	return typeof productData?.activeProductId === 'string'
		&& productData.activeProductId.length > 0
		&& Array.isArray(productData.products)
		&& productData.products.length > 0
		&& productData.products.some((product) => product?.id === productData.activeProductId)
		&& productData.products.every((product) => (
			typeof product?.id === 'string'
			&& product.id.length > 0
			&& typeof product?.label === 'string'
			&& product.label.length > 0
			&& typeof product?.layoutId === 'string'
			&& product.layoutId.length > 0
			&& Array.isArray(product?.instances)
		))
}
