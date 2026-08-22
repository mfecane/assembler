export const CLIENT = {
	MAXSHELF: 'maxshelf',
	KITCHEN: 'kitchen',
} as const

export type Client = (typeof CLIENT)[keyof typeof CLIENT]

// Client-specific asset loading and exported metadata document identifiers.

export const ASSET_CONSTANTS = {
	SCALE_BY_CLIENT: {
		[CLIENT.MAXSHELF]: 0.05,
		[CLIENT.KITCHEN]: 1,
	} satisfies Record<Client, number>,
	METADATA_FORMAT: 'maxshelf-asset-metadata',
	METADATA_FORMAT_VERSION: 1,
} as const

// Shared measurements and rendering settings for Three.js scenes.

export const SCENE_CONSTANTS = {
	TECHNICAL_GRID: {
		size: 10,
		divisions: 10,
		centerLineColor: 0x888888,
		lineColor: 0x777777,
		fadeStart: 0.5,
	},
	ORIGIN_MARKER: {
		radius: 0.02,
		pixelRadius: 2,
	},
	LAYOUT_FLOOR: {
		size: 100,
		fadeStart: 0.08,
		fadeEnd: 0.32,
	},
	CAT_HEIGHT: 0.45,
	CAT_ASPECT_RATIO: 5 / 6,
	CAT_FRONT_OFFSET: 0.5,
	ENVIRONMENT_BACKGROUND_BLURRINESS: 0.6,
	ENVIRONMENT_BACKGROUND_INTENSITY: 1.8,
	ENVIRONMENT_INTENSITY: 0.6,
} as const

// Asset-name lookup records; their keys describe assets rather than constants.

export const MAXSHELF_ASSET_IDS = {
	backpanel665x100: 'asset:maxshelf:backpanel:665x100-plain',
	backpanel665x300: 'asset:maxshelf:backpanel:665x300-plain',
	backpanel665x400: 'asset:maxshelf:backpanel:665x400-plain',
	backpanel1000x100: 'asset:maxshelf:backpanel:1000x100-plain',
	backpanel1000x300: 'asset:maxshelf:backpanel:1000x300-plain',
	backpanel1000x400: 'asset:maxshelf:backpanel:1000x400-plain',
	backpanel1250x100: 'asset:maxshelf:backpanel:1250x100-plain',
	backpanel1250x300: 'asset:maxshelf:backpanel:1250x300-plain',
	backpanel1250x400: 'asset:maxshelf:backpanel:1250x400-plain',
	baseLeg300: 'asset:maxshelf:base-leg:300',
	baseLeg370: 'asset:maxshelf:base-leg:370',
	baseLeg470: 'asset:maxshelf:base-leg:470',
	baseLeg570: 'asset:maxshelf:base-leg:570',
	bracket300: 'asset:maxshelf:bracket:300',
	bracket370: 'asset:maxshelf:bracket:370',
	bracket470: 'asset:maxshelf:bracket:470',
	bracket570: 'asset:maxshelf:bracket:570',
	shelf665x300: 'asset:maxshelf:shelf:665x300',
	shelf665x370: 'asset:maxshelf:shelf:665x370',
	shelf1000x300: 'asset:maxshelf:shelf:1000x300',
	shelf1000x370: 'asset:maxshelf:shelf:1000x370',
	shelf1000x470: 'asset:maxshelf:shelf:1000x470',
	shelf1250x300: 'asset:maxshelf:shelf:1250x300',
	shelf1250x370: 'asset:maxshelf:shelf:1250x370',
	shelf470: 'asset:maxshelf:shelf:470',
	upright1200: 'asset:maxshelf:upright:1200',
	upright1400: 'asset:maxshelf:upright:1400',
	upright1600: 'asset:maxshelf:upright:1600',
	upright2100: 'asset:maxshelf:upright:2100',
	upright2400: 'asset:maxshelf:upright:2400',
	upright2600: 'asset:maxshelf:upright:2600',
	upright2800: 'asset:maxshelf:upright:2800',
} as const

export const KITCHEN_ASSET_IDS = {
	backPanel: 'asset:kitchen:back-panel',
	bottomPanel: 'asset:kitchen:bottom-panel',
	cabinet: 'asset:kitchen:cabinet',
	door1: 'asset:kitchen:door:1',
	door2: 'asset:kitchen:door:2',
	door3: 'asset:kitchen:door:3',
	faucet1: 'asset:kitchen:faucet:1',
	faucet2: 'asset:kitchen:faucet:2',
	frameSink3: 'asset:kitchen:frame-sink:3',
	frontPanel: 'asset:kitchen:front-panel',
	handle1: 'asset:kitchen:handle:1',
	handle2: 'asset:kitchen:handle:2',
	innerSidePanel: 'asset:kitchen:inner-side-panel',
	leg: 'asset:kitchen:leg',
	outerSidePanel: 'asset:kitchen:outer-side-panel',
	sink3: 'asset:kitchen:sink:3',
	tabletop1: 'asset:kitchen:tabletop:1',
	tabletop2: 'asset:kitchen:tabletop:2',
	tabletop3: 'asset:kitchen:tabletop:3',
	topPanelSmall: 'asset:kitchen:top-panel-small',
} as const

// Compatibility records map historical IDs to registered assets.

export const LEGACY_ASSET_ALIASES = [
	{
		id: 'asset:backplate-corner',
		label: 'Backplate Corner (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.backpanel1000x300,
	},
	{
		id: 'asset:backplate-perforated',
		label: 'Backplate Perforated (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.backpanel1000x300,
	},
	{
		id: 'asset:backplate-plain',
		label: 'Backplate Plain (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.backpanel1000x300,
	},
	{
		id: 'asset:base',
		label: 'Base (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.baseLeg470,
	},
	{
		id: 'asset:base-corner',
		label: 'Base Corner (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.baseLeg470,
	},
	{
		id: 'asset:post',
		label: 'Post (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.upright2100,
	},
	{
		id: 'asset:shelf-corner',
		label: 'Shelf Corner (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.shelf1000x370,
	},
	{
		id: 'asset:shelf-label',
		label: 'Shelf Label (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.shelf1000x370,
	},
	{
		id: 'asset:shelf-simple',
		label: 'Shelf Simple (Maxshelf)',
		sourceId: MAXSHELF_ASSET_IDS.shelf1000x370,
	},
] as const

// Project persistence filenames, storage keys, and UI timing.

export const PROJECT_CONSTANTS = {
	PACKAGE_FILE_NAME: 'project.zip',
	METADATA_FILE_NAME: 'metadata.json',
	PROJECT_FILE_NAME: 'project.json',
	AUTOSAVE_DELAY_MS: 800,
	SAVED_CONFIRMATION_MS: 2_000,
	SELECTED_CLIENT_STORAGE_KEY: 'assembler.selected-client',
} as const

// Node graph geometry, interaction timing, and expression limits.

const MATH_EXPRESSION_VARIABLE_NAMES = ['x', 'y', 'z', ...'abcdefghijklmnopqrstuvw'] as const

export const NODE_EDITOR_CONSTANTS = {
	NODE_CENTER_X: 96,
	NODE_CENTER_Y: 64,
	DEFAULT_NODE_WIDTH: 192,
	DEFAULT_NODE_HEIGHT: 128,
	PADDING: 32,
	MINIMUM_WIDTH: 320,
	MINIMUM_HEIGHT: 320,
	MERGE_WINDOW_MS: 750,
	DRAG_PIXELS_PER_STEP: 10,
	MATH_EXPRESSION_AUTOMATIC_INPUT_LIMIT: MATH_EXPRESSION_VARIABLE_NAMES.length,
} as const

// Parametric model validation limits, defaults, and numeric precision.

const STRETCH_BOX_DECIMAL_PLACES = 3

export const PARAMETRIC_MODEL_CONSTANTS = {
	ARRAY_DISTANCE_SNAP: 0.01,
	DEFAULT_ROUND_STEP: 0.001,
	SIZE_COMPARISON_TOLERANCE: 1e-6,
	DEFAULT_ASSET_MATERIAL_ID: 'plastic',
	DEFAULT_PRODUCT_ANIMATION_LABEL: 'Animate',
	DEFAULT_SLOT_ID: 'root-graphs',
	DEFAULT_CHECKER_TEXTURE_SCALE: 1,
	MIN_CHECKER_TEXTURE_SCALE: 1,
	MAX_CHECKER_TEXTURE_SCALE: 16,
	MAX_STRETCH_AXES: 3,
	DEFAULT_MIN_FRACTION: 0.05,
	DEFAULT_MAX_FRACTION: 0.95,
	STRETCH_BOX_DECIMAL_PLACES: STRETCH_BOX_DECIMAL_PLACES,
	STRETCH_BOX_STEP: 10 ** -STRETCH_BOX_DECIMAL_PLACES,
	MAX_STRETCH_SIZE_MULTIPLIER: 10,
	SIZE_PRECISION: 6,
	DEFAULT_MODEL_TEXEL_SIZE_RATIO: 1,
	MIN_MODEL_TEXEL_SIZE_RATIO: 0.01,
	MAX_MODEL_TEXEL_SIZE_RATIO: 10,
	MODEL_TEXEL_SIZE_RATIO_STEP: 0.01,
} as const

// Model editor pointer behavior, highlighting, and interaction target identifiers.

export const MODEL_EDITOR_CONSTANTS = {
	DRAG_THRESHOLD_PX: 4,
	CLICK_DELAY_MS: 250,
	EDIT_OVERLAY_COLOR: 0xfacc15,
	STRETCH_PLANE_PERPENDICULAR_MARGIN: 0.1,
	MODEL_INTERACTION_TARGET: 'model',
	STRETCH_AXIS_INTERACTION_TARGET: 'stretch-axis',
	STRETCH_BOUNDARY_INTERACTION_TARGET: 'stretch-boundary',
	PIVOT_INTERACTION_TARGET: 'pivot',
	PIVOT_ANCHOR_INTERACTION_TARGET: 'pivot-anchor',
} as const
