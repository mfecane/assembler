import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from 'react'
import type { Editor } from '@/parametric/editor/Editor'
import type { EditorController } from '@/parametric/editor/EditorController'
import type { ReactBridge, ReactBridgeSnapshot } from '@/parametric/editor/ReactBridge'

const EditorContext = createContext<Editor | undefined>(undefined)

export interface GraphPreview {
	nodeId: string | null
	previewNode: (nodeId: string) => void
	showGraphOutput: () => void
}

export function EditorProvider({
	editor,
	children,
}: {
	editor: Editor
	children: ReactNode
}) {
	useEffect(() => {
		editor.retain()
		return () => editor.release()
	}, [editor])

	return (
		<EditorContext.Provider value={editor}>
			{children}
		</EditorContext.Provider>
	)
}

export function useEditor(): Editor {
	const editor = useContext(EditorContext)
	if (!editor) throw new Error('Editor hooks must be used inside EditorProvider')
	return editor
}

export function useEditorController(): EditorController {
	return useEditor().controller
}

export function useReactBridge(): ReactBridge {
	return useEditor().bridge
}

export function useGraphPreview(): GraphPreview {
	const editor = useEditor()
	const snapshot = useSyncExternalStore(
		editor.bridge.subscribe,
		editor.bridge.getSnapshot,
		editor.bridge.getSnapshot
	)
	return useMemo(() => ({
		nodeId: snapshot.previewNodeId,
		previewNode: (nodeId: string) => editor.viewport.controller.openNode(nodeId),
		showGraphOutput: () => editor.viewport.controller.showGraphOutput(),
	}), [editor, snapshot.previewNodeId])
}

export function useReactBridgeSnapshot(): ReactBridgeSnapshot {
	const bridge = useReactBridge()
	return useSyncExternalStore(
		bridge.subscribe,
		bridge.getSnapshot,
		bridge.getSnapshot
	)
}
