import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useSyncExternalStore,
} from 'react'
import type { ModelEditorInstance } from '@/models/editor/Editor'
import type { ModelProjectSnapshot } from '@/models/editor/ModelProject'
import type { ModelReactBridgeSnapshot } from '@/models/editor/ReactBridge'

const ModelEditorContext = createContext<ModelEditorInstance | undefined>(undefined)

export function ModelEditorProvider({
	editor,
	children,
}: {
	editor: ModelEditorInstance
	children: ReactNode
}) {
	useEffect(() => {
		editor.retain()
		return () => editor.release()
	}, [editor])

	return (
		<ModelEditorContext.Provider value={editor}>
			{children}
		</ModelEditorContext.Provider>
	)
}

export function useModelEditorInstance(): ModelEditorInstance {
	const editor = useContext(ModelEditorContext)
	if (!editor) throw new Error('Model editor hooks must be used inside ModelEditorProvider.')
	return editor
}

export function useModelProjectSnapshot(): ModelProjectSnapshot {
	const project = useModelEditorInstance().controller.project
	return useSyncExternalStore(project.subscribe, project.getSnapshot, project.getSnapshot)
}

export function useModelReactBridgeSnapshot(): ModelReactBridgeSnapshot {
	const bridge = useModelEditorInstance().bridge
	return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot)
}
