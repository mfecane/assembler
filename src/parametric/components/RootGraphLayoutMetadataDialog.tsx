import { Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
	getGraphLayoutBindingOptions,
	layoutAxisRoles,
	type LayoutAxisRole,
	type RootGraphAxisBinding,
} from '@/layout/GraphLayoutMetadata'
import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

const UNMAPPED = '__unmapped__'

const axisLabels: Record<LayoutAxisRole, string> = {
	primary: 'Width',
	secondary: 'Depth',
	tertiary: 'Height',
}

export function RootGraphLayoutMetadataDialog({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	const controller = useEditorController()
	const { activeGraphId, document } = useGraphSnapshot()
	const graph = document.requireGraph(activeGraphId)
	const options = getGraphLayoutBindingOptions(graph)
	const bindings = document.getRootGraphLayoutMetadata(activeGraphId)?.axisBinding

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent data-id="root-graph-layout-metadata-dialog" className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Ruler className="size-4" aria-hidden="true" />
						Layout dimensions
					</DialogTitle>
					<DialogDescription>
						Map this root graph’s public inputs to its width, depth, and height.
					</DialogDescription>
				</DialogHeader>
				<div data-id="root-graph-axis-bindings" className="space-y-3">
					{layoutAxisRoles.map((role) => (
						<div key={role} className="space-y-1">
							<Label htmlFor={`root-graph-${role}-axis-binding`}>
								{axisLabels[role]}
							</Label>
							<Select
								value={bindingToPath(bindings?.[role]) ?? UNMAPPED}
								onValueChange={(path) => controller.setRootGraphLayoutAxisBinding(
									activeGraphId,
									role,
									path === UNMAPPED ? null : pathToBinding(path)
								)}
							>
								<SelectTrigger
									id={`root-graph-${role}-axis-binding`}
									data-id={`root-graph-${role}-axis-binding`}
								>
									<SelectValue placeholder={`${axisLabels[role]} is not mapped`} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={UNMAPPED}>{axisLabels[role]} · Not mapped</SelectItem>
									{options.map((option) => (
										<SelectItem key={option.path} value={option.path}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button type="button" onClick={onClose}>Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

function bindingToPath(binding: RootGraphAxisBinding | undefined): string | undefined {
	if (!binding) return undefined
	return binding.component ? `${binding.inputId}.${binding.component}` : binding.inputId
}

function pathToBinding(path: string): RootGraphAxisBinding {
	const componentMatch = path.match(/^(.*)\.([xyz])$/)
	return componentMatch
		? { inputId: componentMatch[1], component: componentMatch[2] as 'x' | 'y' | 'z' }
		: { inputId: path }
}
