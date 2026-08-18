import backpanel1000x100Url from '../../../assets/maxshelf/backpanel/1000x100plain.glb?url'
import backpanel1000x300Url from '../../../assets/maxshelf/backpanel/1000x300plain (1).glb?url'
import backpanel1000x400Url from '../../../assets/maxshelf/backpanel/1000x400plain (2).glb?url'
import backpanel1250x100Url from '../../../assets/maxshelf/backpanel/1250x100plain.glb?url'
import backpanel1250x300Url from '../../../assets/maxshelf/backpanel/1250x300plain.glb?url'
import backpanel1250x400Url from '../../../assets/maxshelf/backpanel/1250x400plain.glb?url'
import backpanel665x100Url from '../../../assets/maxshelf/backpanel/665x100plain.glb?url'
import backpanel665x300Url from '../../../assets/maxshelf/backpanel/665x300plain.glb?url'
import backpanel665x400Url from '../../../assets/maxshelf/backpanel/665x400plain.glb?url'
import baseLeg300Url from '../../../assets/maxshelf/baseleg/baseleg300 (1).glb?url'
import baseLeg370Url from '../../../assets/maxshelf/baseleg/baseleg370 (1).glb?url'
import baseLeg470Url from '../../../assets/maxshelf/baseleg/baseleg470.glb?url'
import baseLeg570Url from '../../../assets/maxshelf/baseleg/baseleg570.glb?url'
import bracket300Url from '../../../assets/maxshelf/bracket/300bracket (1).glb?url'
import bracket370Url from '../../../assets/maxshelf/bracket/370bracket.glb?url'
import bracket470Url from '../../../assets/maxshelf/bracket/470bracket.glb?url'
import bracket570Url from '../../../assets/maxshelf/bracket/570bracket.glb?url'
import shelf1000x300Url from '../../../assets/maxshelf/shelf/1000x300shelf.glb?url'
import shelf1000x370Url from '../../../assets/maxshelf/shelf/1000x370shelf.glb?url'
import shelf1000x470Url from '../../../assets/maxshelf/shelf/1000x470shelf.glb?url'
import shelf1250x300Url from '../../../assets/maxshelf/shelf/1250x300shelf.glb?url'
import shelf1250x370Url from '../../../assets/maxshelf/shelf/1250x370shelf.glb?url'
import shelf665x300Url from '../../../assets/maxshelf/shelf/665x300shelf.glb?url'
import shelf665x370Url from '../../../assets/maxshelf/shelf/665x370shelf.glb?url'
import shelf470Url from '../../../assets/maxshelf/shelf/shelf470.glb?url'
import upright1200Url from '../../../assets/maxshelf/upright/1200upright.glb?url'
import upright1400Url from '../../../assets/maxshelf/upright/1400upright.glb?url'
import upright1600Url from '../../../assets/maxshelf/upright/1600upright.glb?url'
import upright2100Url from '../../../assets/maxshelf/upright/2100upright.glb?url'
import upright2400Url from '../../../assets/maxshelf/upright/2400upright (1).glb?url'
import upright2600Url from '../../../assets/maxshelf/upright/2600upright.glb?url'
import upright2800Url from '../../../assets/maxshelf/upright/2800upright.glb?url'
import { Client, MAXSHELF_ASSET_IDS } from '@/cosntants'
import type { AssetRegistrar, AssetRegistration } from '@/parametric/three/AssetRegistrar'

export function registerMaxshelfAssets(registrar: AssetRegistrar): void {
	const register = (asset: Omit<AssetRegistration, 'client'>) => {
		registrar.register({ ...asset, client: Client.MAXSHELF })
	}

	register({
		id: MAXSHELF_ASSET_IDS.backpanel665x100,
		label: 'Backpanel 665 × 100 mm — Plain',
		url: backpanel665x100Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel665x300,
		label: 'Backpanel 665 × 300 mm — Plain',
		url: backpanel665x300Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel665x400,
		label: 'Backpanel 665 × 400 mm — Plain',
		url: backpanel665x400Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1000x100,
		label: 'Backpanel 1000 × 100 mm — Plain',
		url: backpanel1000x100Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1000x300,
		label: 'Backpanel 1000 × 300 mm — Plain',
		url: backpanel1000x300Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1000x400,
		label: 'Backpanel 1000 × 400 mm — Plain',
		url: backpanel1000x400Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1250x100,
		label: 'Backpanel 1250 × 100 mm — Plain',
		url: backpanel1250x100Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1250x300,
		label: 'Backpanel 1250 × 300 mm — Plain',
		url: backpanel1250x300Url,
	})
	register({
		id: MAXSHELF_ASSET_IDS.backpanel1250x400,
		label: 'Backpanel 1250 × 400 mm — Plain',
		url: backpanel1250x400Url,
	})

	register({ id: MAXSHELF_ASSET_IDS.baseLeg300, label: 'Base Leg 300 mm', url: baseLeg300Url })
	register({ id: MAXSHELF_ASSET_IDS.baseLeg370, label: 'Base Leg 370 mm', url: baseLeg370Url })
	register({ id: MAXSHELF_ASSET_IDS.baseLeg470, label: 'Base Leg 470 mm', url: baseLeg470Url })
	register({ id: MAXSHELF_ASSET_IDS.baseLeg570, label: 'Base Leg 570 mm', url: baseLeg570Url })

	register({ id: MAXSHELF_ASSET_IDS.bracket300, label: 'Bracket 300 mm', url: bracket300Url })
	register({ id: MAXSHELF_ASSET_IDS.bracket370, label: 'Bracket 370 mm', url: bracket370Url })
	register({ id: MAXSHELF_ASSET_IDS.bracket470, label: 'Bracket 470 mm', url: bracket470Url })
	register({ id: MAXSHELF_ASSET_IDS.bracket570, label: 'Bracket 570 mm', url: bracket570Url })

	register({ id: MAXSHELF_ASSET_IDS.shelf665x300, label: 'Shelf 665 × 300 mm', url: shelf665x300Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf665x370, label: 'Shelf 665 × 370 mm', url: shelf665x370Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf1000x300, label: 'Shelf 1000 × 300 mm', url: shelf1000x300Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf1000x370, label: 'Shelf 1000 × 370 mm', url: shelf1000x370Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf1000x470, label: 'Shelf 1000 × 470 mm', url: shelf1000x470Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf1250x300, label: 'Shelf 1250 × 300 mm', url: shelf1250x300Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf1250x370, label: 'Shelf 1250 × 370 mm', url: shelf1250x370Url })
	register({ id: MAXSHELF_ASSET_IDS.shelf470, label: 'Shelf 470 mm', url: shelf470Url })

	register({ id: MAXSHELF_ASSET_IDS.upright1200, label: 'Upright 1200 mm', url: upright1200Url })
	register({ id: MAXSHELF_ASSET_IDS.upright1400, label: 'Upright 1400 mm', url: upright1400Url })
	register({ id: MAXSHELF_ASSET_IDS.upright1600, label: 'Upright 1600 mm', url: upright1600Url })
	register({ id: MAXSHELF_ASSET_IDS.upright2100, label: 'Upright 2100 mm', url: upright2100Url })
	register({ id: MAXSHELF_ASSET_IDS.upright2400, label: 'Upright 2400 mm', url: upright2400Url })
	register({ id: MAXSHELF_ASSET_IDS.upright2600, label: 'Upright 2600 mm', url: upright2600Url })
	register({ id: MAXSHELF_ASSET_IDS.upright2800, label: 'Upright 2800 mm', url: upright2800Url })
}
