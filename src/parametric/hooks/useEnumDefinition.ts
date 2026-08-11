import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function useEnumDefinition(inputId: string) {
	const controller = useEditorController()
	const { document, activeGraphId } = useGraphSnapshot()
	const input = document.requireGraph(activeGraphId).inputs.find(
		(candidate) => candidate.id === inputId
	)
	if (input?.valueType !== 'enum' || !input.enumId) return undefined
	const definition = document.requireEnumDefinition(input.enumId)

	return {
		input,
		definition,
		definitions: document.getEnumDefinitions(),
		usageCount: document.getEnumUsageCount(definition.id),
		setDefinition: (enumId: string) => controller.setGraphInputEnum(inputId, enumId),
		createDefinition: () => controller.createEnumForGraphInput(inputId),
		renameDefinition: (name: string) => controller.renameEnum(definition.id, name),
		addOption: () => controller.addEnumOption(definition.id),
		renameOption: (index: number, option: string) => (
			controller.renameEnumOption(definition.id, index, option)
		),
		removeOption: (index: number) => controller.removeEnumOption(definition.id, index),
		setDefault: (defaultValue: string) => controller.updateGraphInput(inputId, { defaultValue }),
	}
}
