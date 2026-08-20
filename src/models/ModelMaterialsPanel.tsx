import { Layers3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ModelPanelSection } from '@/models/ModelPanelSection'
import type { MaterialDefinition } from '@/parametric/model/MaterialDefinition'

export function ModelMaterialsPanel({ materials }: { materials: readonly MaterialDefinition[] }) {
	return (
		<ModelPanelSection
			id="model-materials-panel"
			title="Registered materials"
			icon={Layers3}
			status={<Badge variant="outline">{materials.length}</Badge>}
		>
			<Table data-id="model-materials-table">
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Roughness</TableHead>
						<TableHead>Metalness</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{materials.map((material) => (
						<TableRow key={material.id} data-id={`model-material-${material.id}`}>
							<TableCell className="break-words">{material.label}</TableCell>
							<TableCell className="font-mono text-xs">{material.roughness}</TableCell>
							<TableCell className="font-mono text-xs">{material.metalness}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</ModelPanelSection>
	)
}
