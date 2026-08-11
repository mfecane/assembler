import { useEditorController } from '@/parametric/editor/react/EditorContext'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'
import type { SumMaximumByEnumConstraintDefinition } from '@/parametric/model/ConfigurationConstraint'
import type { GraphInputDefinition } from '@/parametric/model/GraphDocumentModel'

export interface ConfigurationConstraintEditorState {
	constraints: SumMaximumByEnumConstraintDefinition[]
	enumInputs: GraphInputDefinition[]
	numberInputs: GraphInputDefinition[]
	canAddConstraint: boolean
	addConstraint: () => void
	removeConstraint: (index: number) => void
	setSelector: (index: number, selectorInputId: string) => void
	toggleInput: (index: number, inputId: string, checked: boolean) => void
	moveInput: (index: number, inputId: string, direction: -1 | 1) => void
	setMaximum: (index: number, option: string, maximum: number) => void
	isUsedByOtherConstraint: (index: number, inputId: string) => boolean
	getEnumOptions: (inputId: string) => string[]
}

export function useConfigurationConstraintEditor(): ConfigurationConstraintEditorState {
	const controller = useEditorController()
	const { document, activeRootGraphId } = useGraphSnapshot()
	const inputs = document.requireGraph(activeRootGraphId).inputs
	const numberInputs = inputs.filter((input) => input.valueType === 'number')
	const enumInputs = inputs.filter((input) => input.valueType === 'enum')
	const constraints = document.getConfigurationConstraints(activeRootGraphId)
	const usedInputIds = new Set(constraints.flatMap((constraint) => constraint.inputIds))
	const availableNumberInputs = numberInputs.filter((input) => !usedInputIds.has(input.id))
	const canAddConstraint = availableNumberInputs.length >= 2 && enumInputs.length > 0

	const setConstraints = (next: SumMaximumByEnumConstraintDefinition[]) => {
		controller.setConfigurationConstraints(activeRootGraphId, next)
	}

	const updateConstraint = (
		index: number,
		update: (constraint: SumMaximumByEnumConstraintDefinition) => SumMaximumByEnumConstraintDefinition
	) => {
		setConstraints(constraints.map((constraint, candidateIndex) => (
			candidateIndex === index ? update(constraint) : constraint
		)))
	}

	const getCurrentTotal = (inputIds: string[]): number => inputIds.reduce((total, inputId) => {
		const value = document.getRootInputValue(activeRootGraphId, inputId)
		if (typeof value !== 'number') {
			throw new Error(
				`Cannot configure sum-maximum constraint on root graph "${activeRootGraphId}": `
				+ `input "${inputId}" does not have a numeric value. `
				+ `Received ${JSON.stringify(value)}.`
			)
		}
		return total + value
	}, 0)

	return {
		constraints,
		enumInputs,
		numberInputs,
		canAddConstraint,
		getEnumOptions: (inputId) => {
			const input = enumInputs.find((candidate) => candidate.id === inputId)
			return input ? document.getInputOptions(input) : []
		},
		addConstraint: () => {
			const inputIds = availableNumberInputs.slice(0, 2).map((input) => input.id)
			const selector = enumInputs[0]
			if (inputIds.length < 2 || !selector) return
			const total = getCurrentTotal(inputIds)
			setConstraints([...constraints, {
				type: 'sumMaximumByEnum',
				inputIds,
				selectorInputId: selector.id,
				maximums: Object.fromEntries(
					document.getInputOptions(selector).map((option) => [option, total])
				),
			}])
		},
		removeConstraint: (index) => {
			setConstraints(constraints.filter((_, candidateIndex) => candidateIndex !== index))
		},
		setSelector: (index, selectorInputId) => {
			const selector = enumInputs.find((input) => input.id === selectorInputId)
			if (!selector) return
			updateConstraint(index, (constraint) => {
				const total = getCurrentTotal(constraint.inputIds)
				return {
					...constraint,
					selectorInputId,
					maximums: Object.fromEntries(
						document.getInputOptions(selector).map((option) => [option, total])
					),
				}
			})
		},
		toggleInput: (index, inputId, checked) => {
			updateConstraint(index, (constraint) => ({
				...constraint,
				inputIds: checked
					? [...constraint.inputIds, inputId]
					: constraint.inputIds.filter((candidateId) => candidateId !== inputId),
			}))
		},
		moveInput: (index, inputId, direction) => {
			updateConstraint(index, (constraint) => {
				const sourceIndex = constraint.inputIds.indexOf(inputId)
				const targetIndex = sourceIndex + direction
				if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= constraint.inputIds.length) {
					return constraint
				}
				const inputIds = [...constraint.inputIds]
				inputIds.splice(sourceIndex, 1)
				inputIds.splice(targetIndex, 0, inputId)
				return { ...constraint, inputIds }
			})
		},
		setMaximum: (index, option, maximum) => {
			if (!Number.isFinite(maximum) || maximum < 0) return
			updateConstraint(index, (constraint) => ({
				...constraint,
				maximums: { ...constraint.maximums, [option]: maximum },
			}))
		},
		isUsedByOtherConstraint: (index, inputId) => constraints.some(
			(constraint, candidateIndex) => (
				candidateIndex !== index && constraint.inputIds.includes(inputId)
			)
		),
	}
}
