import type { NodeProps } from '@xyflow/react'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import { useGraphSnapshot } from '@/parametric/hooks/useGraphSnapshot'

export function OutputNode({ id }: NodeProps<ParametricFlowNode>) {
	const { document, activeGraphId } = useGraphSnapshot()
	const output = document.requireGraph(activeGraphId).output
	return (
		<NodeSurface nodeId={id} dataId={`output-node-${id}`}>
			<NodePortRow nodeId={id} portId={output.id} valueType={output.valueType} direction="input" label="Output" />
		</NodeSurface>
	)
}
