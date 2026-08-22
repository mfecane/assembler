import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChoiceSetSelector } from '@/parametric/components/ChoiceSetSelector'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { useEnumDefinition } from '@/parametric/hooks/useEnumDefinition'

export function EnumDefinitionFields({
	inputId,
	valueConnected,
}: {
	inputId: string
	valueConnected: boolean
}) {
	const binding = useEnumDefinition(inputId)
	if (!binding) return null
	const { definition, input } = binding
	return (
		<div data-id={`enum-definition-fields-${inputId}`} className="flex flex-col gap-2">
			<ChoiceSetSelector dataId={`graph-input-enum-definition-${inputId}`} definition={definition}
				definitions={binding.definitions} usageCount={binding.usageCount}
				onDefinitionChange={binding.setDefinition} onRename={binding.renameDefinition}
				onAddOption={binding.addOption} onRenameOption={binding.renameOption}
				onRemoveOption={binding.removeOption} onMoveOption={binding.moveOption}
				onCreateDefinition={binding.createDefinition}
				onDeleteDefinition={() => binding.deleteDefinition()}
				canDeleteDefinition={binding.definitions.length > 1 && binding.usageCount === 1} />
			<NodePortRow nodeId={inputId} portId="value" valueType="enum" direction="both">
				<Select
					value={String(input.defaultValue ?? 0)}
					disabled={valueConnected}
					onValueChange={(value) => binding.setDefault(Number(value))}
				>
					<SelectTrigger data-id={`graph-input-enum-default-${inputId}`} className="nodrag h-8 px-2 text-xs" aria-label="Value"><SelectValue /></SelectTrigger>
					<SelectContent>{definition.options.map((option, index) => <SelectItem key={index} value={String(index)}>{option}</SelectItem>)}</SelectContent>
				</Select>
			</NodePortRow>
		</div>
	)
}
