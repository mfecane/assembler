import { Boxes, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

export type ProjectEditorMode = 'graph' | 'layout'

const editorModes: ReadonlyArray<{
	mode: ProjectEditorMode
	label: string
	icon: typeof Workflow
}> = [
	{ mode: 'graph', label: 'Graph Editor', icon: Workflow },
	{ mode: 'layout', label: 'Product Editor', icon: Boxes },
]

export function ProjectEditorTabs({
	value,
	onValueChange,
}: {
	value: ProjectEditorMode
	onValueChange: (mode: ProjectEditorMode) => void
}) {
	return (
		<ButtonGroup
			data-id="project-editor-tabs"
			role="tablist"
			aria-label="Project editors"
		>
			{editorModes.map(({ mode, label, icon: Icon }) => (
				<Button
					key={mode}
					id={`${mode}-editor-tab`}
					data-id={`${mode}-editor-tab`}
					type="button"
					role="tab"
					variant={value === mode ? 'secondary' : 'outline'}
					size="sm"
					aria-selected={value === mode}
					aria-controls={`${mode}-editor-panel`}
					onClick={() => onValueChange(mode)}
				>
					<Icon />
					{label}
				</Button>
			))}
		</ButtonGroup>
	)
}
