import backPanelUrl from '../../../assets/kitchen/back-panel.glb?url'
import bottomPanelUrl from '../../../assets/kitchen/bottom-panel.glb?url'
import cabinetUrl from '../../../assets/kitchen/cabinet.glb?url'
import door1Url from '../../../assets/kitchen/door_1.glb?url'
import door2Url from '../../../assets/kitchen/door_2.glb?url'
import door3Url from '../../../assets/kitchen/door_3.glb?url'
import faucet1Url from '../../../assets/kitchen/faucet_1.glb?url'
import faucet2Url from '../../../assets/kitchen/faucet_2.glb?url'
import frameSink3Url from '../../../assets/kitchen/frame_sink_3.glb?url'
import frontPanelUrl from '../../../assets/kitchen/front-panel.glb?url'
import handle1Url from '../../../assets/kitchen/handle_1.glb?url'
import handle2Url from '../../../assets/kitchen/handle_2.glb?url'
import innerSidePanelUrl from '../../../assets/kitchen/inner-side-panel.glb?url'
import legUrl from '../../../assets/kitchen/leg.glb?url'
import outerSidePanelUrl from '../../../assets/kitchen/outer-side-panel.glb?url'
import sink3Url from '../../../assets/kitchen/sink_3.glb?url'
import tabletop1Url from '../../../assets/kitchen/tabletop_1.glb?url'
import tabletop2Url from '../../../assets/kitchen/tabletop_2.glb?url'
import tabletop3Url from '../../../assets/kitchen/tabletop_3.glb?url'
import topPanelSmallUrl from '../../../assets/kitchen/top-panel-smol.glb?url'
import { CLIENT, KITCHEN_ASSET_IDS } from '@/constants'
import type { AssetRegistrar, AssetRegistration } from '@/parametric/three/AssetRegistrar'

const kitchenAssets: Omit<AssetRegistration, 'client'>[] = [
	{ id: KITCHEN_ASSET_IDS.backPanel, label: 'Back Panel', url: backPanelUrl },
	{ id: KITCHEN_ASSET_IDS.bottomPanel, label: 'Bottom Panel', url: bottomPanelUrl },
	{ id: KITCHEN_ASSET_IDS.cabinet, label: 'Cabinet', url: cabinetUrl },
	{ id: KITCHEN_ASSET_IDS.door1, label: 'Door 1', url: door1Url },
	{ id: KITCHEN_ASSET_IDS.door2, label: 'Door 2', url: door2Url },
	{ id: KITCHEN_ASSET_IDS.door3, label: 'Door 3', url: door3Url },
	{ id: KITCHEN_ASSET_IDS.faucet1, label: 'Faucet 1', url: faucet1Url },
	{ id: KITCHEN_ASSET_IDS.faucet2, label: 'Faucet 2', url: faucet2Url },
	{ id: KITCHEN_ASSET_IDS.frameSink3, label: 'Frame Sink 3', url: frameSink3Url },
	{ id: KITCHEN_ASSET_IDS.frontPanel, label: 'Front Panel', url: frontPanelUrl },
	{ id: KITCHEN_ASSET_IDS.handle1, label: 'Handle 1', url: handle1Url },
	{ id: KITCHEN_ASSET_IDS.handle2, label: 'Handle 2', url: handle2Url },
	{ id: KITCHEN_ASSET_IDS.innerSidePanel, label: 'Inner Side Panel', url: innerSidePanelUrl },
	{ id: KITCHEN_ASSET_IDS.leg, label: 'Leg', url: legUrl },
	{ id: KITCHEN_ASSET_IDS.outerSidePanel, label: 'Outer Side Panel', url: outerSidePanelUrl },
	{ id: KITCHEN_ASSET_IDS.sink3, label: 'Sink 3', url: sink3Url },
	{ id: KITCHEN_ASSET_IDS.tabletop1, label: 'Tabletop 1', url: tabletop1Url },
	{ id: KITCHEN_ASSET_IDS.tabletop2, label: 'Tabletop 2', url: tabletop2Url },
	{ id: KITCHEN_ASSET_IDS.tabletop3, label: 'Tabletop 3', url: tabletop3Url },
	{ id: KITCHEN_ASSET_IDS.topPanelSmall, label: 'Top Panel Small', url: topPanelSmallUrl },
]

export function registerKitchenAssets(registrar: AssetRegistrar): void {
	for (const asset of kitchenAssets) {
		registrar.register({ ...asset, client: CLIENT.KITCHEN })
	}
}
