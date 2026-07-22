export class DynamicInputPorts {
	private portIds: string[]
	private nextPortIndex: number

	public constructor(portIds: string[] = ['input-1']) {
		this.portIds = portIds.length > 0 ? [...new Set(portIds)] : ['input-1']
		this.nextPortIndex = this.getNextPortIndex()
	}

	public getIds(): string[] {
		return [...this.portIds]
	}

	public sync(connectedPortIds: ReadonlySet<string>): void {
		const emptyPort = this.portIds.find((portId) => !connectedPortIds.has(portId))
		if (emptyPort) {
			this.portIds = this.portIds.filter(
				(portId) => connectedPortIds.has(portId) || portId === emptyPort
			)
			return
		}

		this.portIds.push(`input-${this.nextPortIndex}`)
		this.nextPortIndex += 1
	}

	private getNextPortIndex(): number {
		const largestIndex = this.portIds.reduce((largest, portId) => {
			const match = /^input-(\d+)$/.exec(portId)
			return match ? Math.max(largest, Number(match[1])) : largest
		}, 0)
		return largestIndex + 1
	}
}
