import { useCallback, useEffect, useState } from 'react'
import type { ModelMetadataRepository } from '@/models/ModelMetadataRepository'
import { ModelEditorInstance } from '@/models/editor/Editor'

export interface ModelEditorLifecycle {
	editor: ModelEditorInstance | null
	isLoading: boolean
	error: string | null
	reload: () => void
}

export function useModelEditor(repository: ModelMetadataRepository, modelId: string): ModelEditorLifecycle {
	const [editor, setEditor] = useState<ModelEditorInstance | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [loadRevision, setLoadRevision] = useState(0)

	useEffect(() => {
		let cancelled = false
		let createdEditor: ModelEditorInstance | null = null
		setEditor(null)
		setIsLoading(true)
		setError(null)
		void ModelEditorInstance.create(modelId, repository)
			.then((nextEditor) => {
				createdEditor = nextEditor
				if (cancelled) {
					nextEditor.dispose()
					return
				}
				setEditor(nextEditor)
			})
			.catch((cause: unknown) => {
				if (cancelled) return
				const message = describeError(cause)
				console.error(message, { cause, modelId, operation: 'create model editor' })
				setError(message)
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
			createdEditor?.dispose()
		}
	}, [loadRevision, modelId, repository])

	const reload = useCallback(() => setLoadRevision((revision) => revision + 1), [])
	return { editor, isLoading, error, reload }
}

function describeError(cause: unknown): string {
	if (cause instanceof Error) {
		return `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
	}
	try {
		return JSON.stringify(cause, null, 2) ?? String(cause)
	} catch {
		return String(cause)
	}
}
