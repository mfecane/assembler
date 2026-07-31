import type { GraphState } from '@/parametric/editor/GraphState'
import { GraphStateCommand } from '@/parametric/editor/commands/GraphStateCommand'

export class CommandFactory {
	public constructor(private readonly state: GraphState) {}

	public mutate(label: string, mutation: () => void, mergeKey?: string): GraphStateCommand {
		return new GraphStateCommand(label, this.state, mutation, mergeKey)
	}
}
