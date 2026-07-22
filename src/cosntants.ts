export const ASSET_SCALE = 0.05
export const ASSET_METADATA_FILE_NAME = 'maxshelf-asset-metadata.json'
export const ASSET_METADATA_FORMAT = 'maxshelf-asset-metadata'
export const ASSET_METADATA_FORMAT_VERSION = 1
export const MAXSHELF_ASSET_ID_PREFIX = 'asset:maxshelf:'

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
