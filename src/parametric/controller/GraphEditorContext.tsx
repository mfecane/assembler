import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from 'react'
import type { GraphController } from '@/parametric/controller/GraphController'
import type { GraphEvaluator } from '@/parametric/evaluation/GraphEvaluator'
import { ViewportEditor } from '@/parametric/three/editor/ViewportEditor'
import type { ViewportBridgeSnapshot } from '@/parametric/three/editor/ViewportReactBridge'

export interface GraphEditorServices {
	controller: GraphController
	evaluator: GraphEvaluator
}

interface GraphEditorRuntimeServices extends GraphEditorServices {
	viewportEditor: ViewportEditor
}

const GraphEditorContext = createContext<GraphEditorRuntimeServices | undefined>(undefined)

export interface GraphPreview {
	nodeId: string | null
	previewNode: (nodeId: string) => void
	showGraphOutput: () => void
}

export function GraphEditorProvider({
	services,
	children,
}: {
	services: GraphEditorServices
	children: ReactNode
}) {
	const viewportEditor = useMemo(
		() => new ViewportEditor(services.controller, services.evaluator),
		[services.controller, services.evaluator]
	)
	const runtimeServices = useMemo(
		() => ({ ...services, viewportEditor }),
		[services, viewportEditor]
	)

	useEffect(() => () => viewportEditor.dispose(), [viewportEditor])

	return (
		<GraphEditorContext.Provider value={runtimeServices}>
			{children}
		</GraphEditorContext.Provider>
	)
}

export function useGraphEditorServices(): GraphEditorServices {
	const services = useContext(GraphEditorContext)
	if (!services) throw new Error('Graph editor hooks must be used inside GraphEditorProvider')
	return services
}

export function useGraphController(): GraphController {
	return useGraphEditorServices().controller
}

export function useGraphPreview(): GraphPreview {
	const editor = useViewportEditor()
	const snapshot = useSyncExternalStore(
		editor.bridge.subscribe,
		editor.bridge.getSnapshot,
		editor.bridge.getSnapshot
	)
	return useMemo(() => ({
		nodeId: snapshot.previewNodeId,
		previewNode: (nodeId: string) => editor.controller.openNode(nodeId),
		showGraphOutput: () => editor.controller.showGraphOutput(),
	}), [editor, snapshot.previewNodeId])
}

export function useViewportEditor(): ViewportEditor {
	const services = useContext(GraphEditorContext)
	if (!services) throw new Error('Viewport editor hooks must be used inside GraphEditorProvider')
	return services.viewportEditor
}

export function useViewportBridgeSnapshot(): ViewportBridgeSnapshot {
	const editor = useViewportEditor()
	return useSyncExternalStore(
		editor.bridge.subscribe,
		editor.bridge.getSnapshot,
		editor.bridge.getSnapshot
	)
}
