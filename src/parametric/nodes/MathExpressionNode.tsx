import { Position, type NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { NodeHeader } from '@/parametric/components/NodeHeader'
import { TypedHandle } from '@/parametric/components/TypedHandle'
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
		<div
			data-id={`math-expression-node-${id}`}
			className="min-w-64 rounded-md border border-border bg-surface px-3 py-2 shadow-md"
		>
			<NodeHeader nodeId={id} />
			<div data-id={`math-expression-fields-${id}`} className="flex flex-col gap-2 text-xs">
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
						'nodrag h-7 font-mono text-xs',
						validationError && 'border-danger focus-visible:ring-danger'
					)}
				/>
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
					<div
						key={inputIndex}
						data-id={`math-expression-input-port-${id}-${inputIndex}`}
						className={cn(
							'relative flex h-7 items-center rounded border border-border bg-input px-2',
							inputIndex === placeholderInputIndex && 'justify-center border-dashed opacity-40'
						)}
					>
						<TypedHandle
							id={String(inputIndex)}
							type="target"
							position={Position.Left}
							valueType="number"
						/>
						{inputIndex !== placeholderInputIndex && (
							<span className="text-muted-foreground">
								${getMathExpressionVariableName(inputIndex)}
							</span>
						)}
						{inputIndex === placeholderInputIndex && (
							<Plus
								data-id={`math-expression-input-placeholder-icon-${id}-${inputIndex}`}
								aria-hidden="true"
								className="size-3.5 text-muted-foreground"
							/>
						)}
					</div>
				))}
			</div>
			<TypedHandle id="number" type="source" position={Position.Right} valueType="number" />
		</div>
	)
}
