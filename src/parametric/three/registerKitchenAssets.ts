import cabinetUrl from '../../../assets/kitchen/cabinet.glb?url'
import door1Url from '../../../assets/kitchen/door_1.glb?url'
import door2Url from '../../../assets/kitchen/door_2.glb?url'
import door3Url from '../../../assets/kitchen/door_3.glb?url'
import faucet1Url from '../../../assets/kitchen/faucet_1.glb?url'
import faucet2Url from '../../../assets/kitchen/faucet_2.glb?url'
import handle1Url from '../../../assets/kitchen/handle_1.glb?url'
import handle2Url from '../../../assets/kitchen/handle_2.glb?url'
import legUrl from '../../../assets/kitchen/leg.glb?url'
import tabletop1Url from '../../../assets/kitchen/tabletop_1.glb?url'
import tabletop2Url from '../../../assets/kitchen/tabletop_2.glb?url'
import tabletop3Url from '../../../assets/kitchen/tabletop_3.glb?url'
import { Client, KITCHEN_ASSET_IDS } from '@/cosntants'
import type { AssetRegistrar, AssetRegistration } from '@/parametric/three/AssetRegistrar'

const kitchenAssets: Omit<AssetRegistration, 'client'>[] = [
	{ id: KITCHEN_ASSET_IDS.cabinet, label: 'Cabinet', url: cabinetUrl },
	{ id: KITCHEN_ASSET_IDS.door1, label: 'Door 1', url: door1Url },
	{ id: KITCHEN_ASSET_IDS.door2, label: 'Door 2', url: door2Url },
	{ id: KITCHEN_ASSET_IDS.door3, label: 'Door 3', url: door3Url },
	{ id: KITCHEN_ASSET_IDS.faucet1, label: 'Faucet 1', url: faucet1Url },
	{ id: KITCHEN_ASSET_IDS.faucet2, label: 'Faucet 2', url: faucet2Url },
	{ id: KITCHEN_ASSET_IDS.handle1, label: 'Handle 1', url: handle1Url },
	{ id: KITCHEN_ASSET_IDS.handle2, label: 'Handle 2', url: handle2Url },
	{ id: KITCHEN_ASSET_IDS.leg, label: 'Leg', url: legUrl },
	{ id: KITCHEN_ASSET_IDS.tabletop1, label: 'Tabletop 1', url: tabletop1Url },
	{ id: KITCHEN_ASSET_IDS.tabletop2, label: 'Tabletop 2', url: tabletop2Url },
	{ id: KITCHEN_ASSET_IDS.tabletop3, label: 'Tabletop 3', url: tabletop3Url },
]

export function registerKitchenAssets(registrar: AssetRegistrar): void {
	for (const asset of kitchenAssets) {
		registrar.register({ ...asset, client: Client.KITCHEN })
	}
}
