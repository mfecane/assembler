import { Position, type NodeProps } from '@xyflow/react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useSelectorNode } from '@/parametric/hooks/useGraphNode'

export function SelectorNode({ id }: NodeProps<ParametricFlowNode>) {
	const binding = useSelectorNode(id)
	if (!binding) return null

	const updateOption = (index: number, value: string) => {
		binding.setOptions(
			binding.options.map((option, optionIndex) => optionIndex === index ? value : option)
		)
	}

	const addOption = () => {
		const usedOptions = new Set(binding.options)
		let optionNumber = binding.options.length + 1
		let option = `Option ${optionNumber}`
		while (usedOptions.has(option)) {
			optionNumber += 1
			option = `Option ${optionNumber}`
		}
		binding.setOptions([...binding.options, option])
	}

	return (
		<div
			data-id={`selector-node-${id}`}
			className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div className="flex flex-col gap-2 text-xs">
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Options</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="nodrag h-6 w-6 text-muted-foreground"
							onClick={addOption}
							aria-label="Add selector option"
							title="Add option"
						>
							<Plus />
						</Button>
					</div>
					{binding.options.map((option, index) => (
						<div key={`${index}:${option}`} className="flex items-center gap-1">
							<Input
								className="nodrag h-7 px-2 text-xs"
								defaultValue={option}
								onBlur={(event) => updateOption(index, event.currentTarget.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') event.currentTarget.blur()
								}}
								aria-label={`Selector option ${index + 1}`}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="nodrag h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => binding.setOptions(
									binding.options.filter((_, optionIndex) => optionIndex !== index)
								)}
								disabled={binding.options.length === 1}
								aria-label={`Remove selector option ${index + 1}`}
								title={binding.options.length === 1 ? 'Selector requires one option' : 'Remove option'}
							>
								<Trash2 />
							</Button>
						</div>
					))}
				</div>
				<Select value={binding.value} onValueChange={binding.setValue}>
					<SelectTrigger className="nodrag h-8 px-2 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
					{binding.options.map((option) => (
						<SelectItem key={option} value={option}>{option}</SelectItem>
					))}
					</SelectContent>
				</Select>
			</div>
			<TypedHandle id="enum" type="source" position={Position.Right} valueType="enum" />
		</div>
	)
}
