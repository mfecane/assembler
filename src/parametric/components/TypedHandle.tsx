import { Handle, type Position } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { GraphValueType } from '@/parametric/model/GraphNode'

interface TypedHandleProps {
	id: string
	type: 'source' | 'target'
	position: Position
	valueType: GraphValueType
	style?: CSSProperties
}

export function TypedHandle({ id, type, position, valueType, style }: TypedHandleProps) {
	return <Handle id={id} type={type} position={position} className={`port-${valueType}`} style={style} />
}
