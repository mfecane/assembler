import type { Editor } from '@/parametric/editor/Editor'
import { EditorProvider } from '@/parametric/editor/react/EditorContext'
import { cn } from '@/lib/utils'
import { LayoutViewport } from '@/layout/LayoutViewport'
import { LayoutOptionsPanel } from '@/layout/LayoutOptionsPanel'
import { LayoutConfigurationsPanel } from '@/layout/LayoutConfigurationsPanel'

export function LayoutEditor({
	editor,
	className,
}: {
	editor: Editor
	className?: string
}) {
	return (
		<div
			id="layout-editor-panel"
			data-id="product-editor"
			role="tabpanel"
			aria-labelledby="layout-editor-tab"
			className={cn('h-screen w-screen', className)}
		>
			<EditorProvider editor={editor}>
				<div data-id="product-editor-workspace" className="flex h-full min-h-0">
					<LayoutConfigurationsPanel />
					<div className="min-w-0 flex-1">
						<LayoutViewport />
					</div>
					<LayoutOptionsPanel />
				</div>
			</EditorProvider>
		</div>
	)
}
