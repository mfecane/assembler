type MathExpression = NumberExpression | VariableExpression | UnaryExpression | BinaryExpression

interface NumberExpression {
	kind: 'number'
	value: number
}

interface VariableExpression {
	kind: 'variable'
	inputIndex: number
}

interface UnaryExpression {
	kind: 'unary'
	operator: '+' | '-'
	expression: MathExpression
}

interface BinaryExpression {
	kind: 'binary'
	operator: '+' | '-' | '*' | '/'
	left: MathExpression
	right: MathExpression
}

interface Token {
	type: 'number' | 'variable' | '+' | '-' | '*' | '/' | '(' | ')' | 'end'
	text: string
	position: number
}

const initialVariableNames = ['x', 'y', 'z', ...'abcdefghijklmnopqrstuvw']

export const MATH_EXPRESSION_AUTOMATIC_INPUT_LIMIT = initialVariableNames.length

export function getMathExpressionVariableName(inputIndex: number): string {
	if (!Number.isInteger(inputIndex) || inputIndex < 0) {
		throw new Error(`Math expression input index must be a non-negative integer; received ${inputIndex}.`)
	}
	return initialVariableNames[inputIndex] ?? `v${inputIndex}`
}

export function getMathExpressionInputIndexes(expression: string): number[] {
	const parsed = parseMathExpression(expression)
	const indexes = new Set<number>()
	collectInputIndexes(parsed, indexes)
	return [...indexes].sort((left, right) => left - right)
}

export function getMathExpressionAvailableInputIndexes(expression: string): number[] {
	const referencedIndexes = getMathExpressionInputIndexes(expression)
	const highestReferencedIndex = referencedIndexes[referencedIndexes.length - 1] ?? -1
	const inputCount = Math.max(
		MATH_EXPRESSION_AUTOMATIC_INPUT_LIMIT,
		highestReferencedIndex + 1
	)
	return Array.from({ length: inputCount }, (_, index) => index)
}

export function getMathExpressionVisibleInputIndexes(occupiedIndexes: readonly number[]): number[] {
	const highestOccupiedIndex = occupiedIndexes.reduce(
		(highest, index) => Math.max(highest, index),
		-1
	)
	const automaticInputCount = Math.min(
		MATH_EXPRESSION_AUTOMATIC_INPUT_LIMIT,
		Math.max(1, highestOccupiedIndex + 2)
	)
	const inputCount = Math.max(automaticInputCount, highestOccupiedIndex + 1)
	return Array.from({ length: inputCount }, (_, index) => index)
}

export function evaluateMathExpression(expression: string, inputs: ReadonlyMap<number, number>): number {
	return evaluate(parseMathExpression(expression), inputs)
}

export function validateMathExpression(expression: string): void {
	parseMathExpression(expression)
}

function parseMathExpression(expression: string): MathExpression {
	if (typeof expression !== 'string') {
		throw new Error(`Math expression must be a string; received ${JSON.stringify(expression)}.`)
	}
	const parser = new MathExpressionParser(expression)
	return parser.parse()
}

class MathExpressionParser {
	private position = 0
	private current: Token

	public constructor(private readonly source: string) {
		if (!source.startsWith('=')) this.fail('Expression must begin with "="', 0)
		this.position = 1
		this.current = this.readToken()
	}

	public parse(): MathExpression {
		const expression = this.parseSum()
		if (this.current.type !== 'end') this.fail(`Unexpected "${this.current.text}"`, this.current.position)
		return expression
	}

	private parseSum(): MathExpression {
		let expression = this.parseProduct()
		while (this.current.type === '+' || this.current.type === '-') {
			const operator = this.current.type
			this.advance()
			expression = { kind: 'binary', operator, left: expression, right: this.parseProduct() }
		}
		return expression
	}

	private parseProduct(): MathExpression {
		let expression = this.parseUnary()
		while (this.current.type === '*' || this.current.type === '/') {
			const operator = this.current.type
			this.advance()
			expression = { kind: 'binary', operator, left: expression, right: this.parseUnary() }
		}
		return expression
	}

	private parseUnary(): MathExpression {
		if (this.current.type === '+' || this.current.type === '-') {
			const operator = this.current.type
			this.advance()
			return { kind: 'unary', operator, expression: this.parseUnary() }
		}
		return this.parsePrimary()
	}

	private parsePrimary(): MathExpression {
		if (this.current.type === 'number') {
			const value = Number(this.current.text)
			this.advance()
			return { kind: 'number', value }
		}
		if (this.current.type === 'variable') {
			const variableToken = this.current
			let inputIndex: number
			try {
				inputIndex = variableNameToInputIndex(variableToken.text.slice(1))
			} catch (cause) {
				this.fail(cause instanceof Error ? cause.message : String(cause), variableToken.position)
			}
			this.advance()
			return { kind: 'variable', inputIndex }
		}
		if (this.current.type === '(') {
			this.advance()
			const expression = this.parseSum()
			const closingToken = this.current
			if (closingToken.type !== ')') this.fail('Expected closing parenthesis', closingToken.position)
			this.advance()
			return expression
		}
		this.fail('Expected a number, variable, or opening parenthesis', this.current.position)
	}

	private advance(): void {
		this.current = this.readToken()
	}

	private readToken(): Token {
		while (/\s/.test(this.source[this.position] ?? '')) this.position += 1
		const tokenPosition = this.position
		const character = this.source[this.position]
		if (!character) return { type: 'end', text: '', position: tokenPosition }
		if ('+-*/()'.includes(character)) {
			this.position += 1
			return { type: character as Token['type'], text: character, position: tokenPosition }
		}
		const number = this.source.slice(this.position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)?.[0]
		if (number) {
			this.position += number.length
			return { type: 'number', text: number, position: tokenPosition }
		}
		const variable = this.source.slice(this.position).match(/^\$[a-z](?:\d+)?/)?.[0]
		if (variable) {
			this.position += variable.length
			return { type: 'variable', text: variable, position: tokenPosition }
		}
		this.fail(`Unexpected "${character}"`, tokenPosition)
	}

	private fail(message: string, position: number): never {
		throw new Error(`Invalid math expression ${JSON.stringify(this.source)}: ${message} at character ${position + 1}.`)
	}
}

function variableNameToInputIndex(name: string): number {
	const index = initialVariableNames.indexOf(name)
	if (index >= 0) return index
	const generatedIndex = name.match(/^v(\d+)$/)?.[1]
	if (generatedIndex !== undefined && Number(generatedIndex) >= initialVariableNames.length) {
		return Number(generatedIndex)
	}
	throw new Error(
		`Unknown math expression variable "$${name}". Use $x, $y, $z, $a through $w, or $v26 and above.`
	)
}

function collectInputIndexes(expression: MathExpression, indexes: Set<number>): void {
	if (expression.kind === 'variable') indexes.add(expression.inputIndex)
	else if (expression.kind === 'unary') collectInputIndexes(expression.expression, indexes)
	else if (expression.kind === 'binary') {
		collectInputIndexes(expression.left, indexes)
		collectInputIndexes(expression.right, indexes)
	}
}

function evaluate(expression: MathExpression, inputs: ReadonlyMap<number, number>): number {
	if (expression.kind === 'number') return expression.value
	if (expression.kind === 'variable') {
		const value = inputs.get(expression.inputIndex)
		if (value === undefined) {
			throw new Error(
				`Math expression requires input ${expression.inputIndex} ($${getMathExpressionVariableName(expression.inputIndex)}).`
			)
		}
		return value
	}
	if (expression.kind === 'unary') {
		const value = evaluate(expression.expression, inputs)
		return expression.operator === '-' ? -value : value
	}
	const left = evaluate(expression.left, inputs)
	const right = evaluate(expression.right, inputs)
	if (expression.operator === '+') return left + right
	if (expression.operator === '-') return left - right
	if (expression.operator === '*') return left * right
	return left / right
}
