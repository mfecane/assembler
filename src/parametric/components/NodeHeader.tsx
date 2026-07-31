import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { nodeViewPresentation } from '@/parametric/nodes/nodeViewRegistry'

export function NodeHeader({
	nodeId,
	actions,
}: {
	nodeId: string
	actions?: ReactNode
}) {
	const controller = useEditorController()
	const { model } = useGraphSnapshot()
	const node = model.getNode(nodeId)
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(node?.getName() ?? '')
	const inputRef = useRef<HTMLInputElement>(null)
	const cancelEditingRef = useRef(false)
	const presentation = node ? nodeViewPresentation[node.type] : undefined
	const Icon = presentation?.icon ?? Circle

	useEffect(() => {
		if (!editing) setDraft(node?.getName() ?? '')
	}, [editing, node])

	useEffect(() => {
		if (editing) inputRef.current?.select()
	}, [editing])

	if (!node) return null

	const finishEditing = () => {
		if (cancelEditingRef.current) {
			cancelEditingRef.current = false
			setDraft(node.getName())
			setEditing(false)
			return
		}
		const name = draft.trim()
		if (name && name !== node.getName()) controller.setNodeName(nodeId, name)
		else setDraft(node.getName())
		setEditing(false)
	}

	return (
		<div
			data-id={`node-header-${nodeId}`}
			className="mb-2 flex min-w-0 items-center justify-between gap-2"
		>
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				<Icon
					data-id={`node-type-icon-${nodeId}`}
					className="size-4 shrink-0 text-primary"
					aria-label={`${presentation?.description ?? node.type} node type`}
				/>
				{editing ? (
					<Input
						ref={inputRef}
						data-id={`node-name-input-${nodeId}`}
						className="nodrag nopan h-7 min-w-24 px-2 text-sm font-semibold"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={finishEditing}
						onKeyDown={(event) => {
							if (event.key === 'Enter') event.currentTarget.blur()
							if (event.key === 'Escape') {
								cancelEditingRef.current = true
								event.currentTarget.blur()
							}
						}}
						aria-label="Node name"
					/>
				) : (
					<div
						data-id={`node-name-${nodeId}`}
						className="nodrag nopan min-w-0 truncate text-sm font-semibold text-foreground"
						title={`${node.getName()} — double-click to rename`}
						onDoubleClick={(event) => {
							event.stopPropagation()
							setEditing(true)
						}}
					>
						{node.getName()}
					</div>
				)}
			</div>
			{actions}
		</div>
	)
}
