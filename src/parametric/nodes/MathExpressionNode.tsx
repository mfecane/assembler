import type { NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useMathExpressionNode } from '@/parametric/hooks/useGraphNode'
import {
	getMathExpressionVariableName,
	validateMathExpression,
} from '@/parametric/model/MathExpression'
import { cn } from '@/lib/utils'

function getValidationError(expression: string): string | null {
	try {
		validateMathExpression(expression)
		return null
	} catch (cause) {
		return cause instanceof Error ? cause.message : String(cause)
	}
}

export function MathExpressionNode({ id }: NodeProps<ParametricFlowNode>) {
	const { expression, inputIndexes, placeholderInputIndex } = useMathExpressionNode(id)
	const [draft, setDraft] = useState(expression.value)
	const validationError = getValidationError(draft)
	const errorId = `${id}-expression-error`

	useEffect(() => setDraft(expression.value), [expression.value])

	const applyExpression = () => {
		if (!validationError && draft !== expression.value) expression.setValue(draft)
	}

	return (
		<NodeSurface nodeId={id} dataId={`math-expression-node-${id}`} className="min-w-64">
			<div data-id={`math-expression-fields-${id}`} className="flex flex-col gap-2 text-xs">
				<NodePortRow
					nodeId={id}
					portId="number"
					valueType="number"
					direction="output"
				>
					<Input
						data-id={`math-expression-input-${id}`}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={applyExpression}
						onKeyDown={(event) => {
							if (event.key !== 'Enter') return
							event.currentTarget.blur()
						}}
						aria-label="Math expression"
						aria-invalid={Boolean(validationError)}
						aria-describedby={validationError ? errorId : undefined}
						spellCheck={false}
						className={cn(
							'nodrag h-7 w-full font-mono text-xs',
							validationError && 'border-danger focus-visible:ring-danger'
						)}
					/>
				</NodePortRow>
				{validationError && (
					<p
						id={errorId}
						data-id={`math-expression-error-${id}`}
						role="alert"
						className="max-w-72 whitespace-normal break-words text-[10px] leading-relaxed text-danger"
					>
						{validationError}
					</p>
				)}
				{inputIndexes.map((inputIndex) => (
					<NodePortRow
						key={inputIndex}
						nodeId={id}
						portId={String(inputIndex)}
						valueType="number"
						direction="input"
						label={inputIndex === placeholderInputIndex
							? <Plus aria-hidden="true" className="size-3.5" />
							: `$${getMathExpressionVariableName(inputIndex)}`}
						className={cn(
							inputIndex === placeholderInputIndex && 'opacity-40'
						)}
					/>
				))}
			</div>
		</NodeSurface>
	)
}
