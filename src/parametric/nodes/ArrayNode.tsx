import type { NodeProps } from '@xyflow/react'
import { GeometryNodeActions } from '@/parametric/components/GeometryNodeActions'
import { NodeCapability } from '@/parametric/components/NodeCapability'
import { NumericInput } from '@/parametric/components/NumericInput'
import { NodePortGroup } from '@/parametric/components/NodePortGroup'
import { NodePortRow } from '@/parametric/components/NodePortRow'
import { NodeSurface } from '@/parametric/components/NodeSurface'
import type { ParametricFlowNode } from '@/parametric/hooks/useFlowGraph'
import { useConnectedInputPorts, useNumericField } from '@/parametric/hooks/useGraphNode'

export function ArrayNode({ id }: NodeProps<ParametricFlowNode>) {
	const countX = useNumericField(id, 'countX', 'X count')
	const countY = useNumericField(id, 'countY', 'Y count')
	const countZ = useNumericField(id, 'countZ', 'Z count')
	const offsetX = useNumericField(id, 'offsetX', 'X offset')
	const offsetY = useNumericField(id, 'offsetY', 'Y offset')
	const offsetZ = useNumericField(id, 'offsetZ', 'Z offset')
	const connectedInputs = useConnectedInputPorts(id)

	return (
		<NodeSurface
			nodeId={id}
			dataId={`array-node-${id}`}
			actions={<GeometryNodeActions nodeId={id} />}
			className="min-w-48"
		>
			<NodePortRow nodeId={id} portId="geometry" valueType="geometry" direction="input" label="Geometry" />
			<NodePortGroup
				nodeId={id}
				portId="geometry"
				valueType="geometry"
				dataId={`array-fields-${id}`}
				className="flex flex-col gap-2 text-xs"
			>
				<ArrayAxisCapability
					nodeId={id}
					axis="X"
					count={countX}
					offset={offsetX}
					connectedInputs={connectedInputs}
				/>
				<ArrayAxisCapability
					nodeId={id}
					axis="Y"
					count={countY}
					offset={offsetY}
					connectedInputs={connectedInputs}
				/>
				<ArrayAxisCapability
					nodeId={id}
					axis="Z"
					count={countZ}
					offset={offsetZ}
					connectedInputs={connectedInputs}
				/>
			</NodePortGroup>
		</NodeSurface>
	)
}

interface ArrayAxisInputsProps {
	nodeId: string
	axis: 'X' | 'Y' | 'Z'
	count: ReturnType<typeof useNumericField>
	offset: ReturnType<typeof useNumericField>
	connectedInputs: ReadonlySet<string>
}

function ArrayAxisCapability({ nodeId, axis, count, offset, connectedInputs }: ArrayAxisInputsProps) {
	const countPortId = `count${axis}`
	const offsetPortId = `offset${axis}`
	const countConnected = connectedInputs.has(countPortId)
	const offsetConnected = connectedInputs.has(offsetPortId)

	return (
		<NodeCapability
			nodeId={nodeId}
			label={`${axis} axis`}
			activeWhen={count.value > 1 || countConnected || offsetConnected}
			onActivate={() => count.setValue(2)}
			onDeactivate={() => count.setValue(1)}
			deactivatable={!countConnected && !offsetConnected}
			collapsible={false}
		>
			<ArrayAxisInputs
				nodeId={nodeId}
				axis={axis}
				count={count}
				offset={offset}
				countConnected={countConnected}
				offsetConnected={offsetConnected}
			/>
		</NodeCapability>
	)
}

function ArrayAxisInputs({
	nodeId,
	axis,
	count,
	offset,
	countConnected,
	offsetConnected,
}: Omit<ArrayAxisInputsProps, 'connectedInputs'> & {
	countConnected: boolean
	offsetConnected: boolean
}) {
	return (
		<div className="flex flex-col gap-2 text-muted-foreground">
			<NodePortRow nodeId={nodeId} portId={`count${axis}`} valueType="number" direction="input" label={`${axis} count`}>
				<NumericInput
					value={count.value}
					onValueChange={count.setValue}
					min={1}
					step={1}
					roundStep={1}
					disabled={countConnected}
				/>
			</NodePortRow>
			<NodePortRow
				nodeId={nodeId}
				portId={`offset${axis}`}
				valueType="number"
				direction="input"
				label={`${axis} offset`}
			>
				<NumericInput
					value={offset.value}
					onValueChange={offset.setValue}
					step={0.01}
					disabled={offsetConnected}
				/>
			</NodePortRow>
		</div>
	)
}
