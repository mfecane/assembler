export type EntityIdKind =
	| 'node'
	| 'edge'
	| 'graph'
	| 'enum'
	| 'product'
	| 'instance'
	| 'slot'
	| 'control'
	| 'section'
	| 'field'

const prefixByKind: Record<EntityIdKind, string> = {
	node: 'nod',
	edge: 'edg',
	graph: 'grf',
	enum: 'enm',
	product: 'prd',
	instance: 'ins',
	slot: 'slt',
	control: 'ctl',
	section: 'sec',
	field: 'fld',
}

export class IdGenerator {
	public create(kind: EntityIdKind, isAvailable: (id: string) => boolean = () => true): string {
		let id: string
		do {
			id = `${prefixByKind[kind]}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
		} while (!isAvailable(id))
		return id
	}
}

export const idGenerator = new IdGenerator()
