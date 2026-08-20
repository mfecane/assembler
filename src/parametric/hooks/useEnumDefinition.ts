import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import { InputGraphNode } from '@/parametric/model/GraphNode'

export function useEnumDefinition(inputId: string) {
	const controller = useEditorController()
	const { document, model } = useGraphSnapshot()
	const node = model.getNode(inputId)
	if (!(node instanceof InputGraphNode) || node.getValueType() !== 'enum' || !node.getEnumId()) {
		return undefined
	}
	const definition = document.requireEnumDefinition(node.getEnumId() as string)
	const input = {
		id: node.id,
		label: node.getName(),
		valueType: 'enum' as const,
		defaultValue: node.getValue(),
		enumId: definition.id,
	}

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
		moveOption: (sourceIndex: number, targetIndex: number) => (
			controller.moveEnumOption(definition.id, sourceIndex, targetIndex)
		),
		setDefault: (defaultValue: number) => controller.updateGraphInput(inputId, { defaultValue }),
	}
}
