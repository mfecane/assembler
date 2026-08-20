import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { materialRepository } from '@/parametric/three/MaterialRepository'

export function MaterialSelect({
	id,
	dataId,
	value,
	onValueChange,
	disabled = false,
	ariaLabel,
	className = 'nodrag h-8 w-full px-2 text-xs',
}: {
	id: string
	dataId: string
	value: string
	onValueChange: (value: string) => void
	disabled?: boolean
	ariaLabel: string
	className?: string
}) {
	const materials = materialRepository.getMaterials()
	if (materials.length === 0) {
		throw new Error(`Cannot render material selector "${id}": no materials are registered.`)
	}

	return (
		<Select value={value} onValueChange={onValueChange} disabled={disabled}>
			<SelectTrigger id={id} data-id={dataId} className={className} aria-label={ariaLabel}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{materials.map((material) => (
					<SelectItem key={material.id} value={material.id}>
						{material.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
