import type {
	GraphDocumentModel,
	GraphDocumentReader,
} from '@/parametric/model/GraphDocumentModel'
import type { GraphModel, GraphModelReader } from '@/parametric/model/GraphModel'
import {
	deserializeGraph,
	serializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'

export interface GraphStateSnapshot {
	readonly revision: number
	readonly evaluationRevision: number
	readonly documentVersion: number
	readonly document: GraphDocumentReader
	readonly activeGraphId: string
	readonly activeRootGraphId: string
	readonly model: GraphModelReader
}

export interface GraphStateCheckpoint {
	document: GraphDocument
	activeGraphId: string
	activeRootGraphId: string
	documentVersion: number
}

type GraphStateListener = () => void

export class GraphState {
	private readonly listeners = new Set<GraphStateListener>()
	private revision = 0
	private evaluationRevision = 0
	private documentVersion = 0
	private nextDocumentVersion = 1
	private activeGraphId: string
	private activeRootGraphId: string
	private snapshot: GraphStateSnapshot

	public constructor(
		private document: GraphDocumentModel,
		private readonly nodeRegistry: NodeRegistry
	) {
		this.activeRootGraphId = document.getDefaultRootGraphId()
		this.activeGraphId = this.activeRootGraphId
		this.snapshot = this.createSnapshot()
	}

	public readonly getSnapshot = (): GraphStateSnapshot => this.snapshot

	public readonly subscribe = (listener: GraphStateListener): (() => void) => {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	public getDocument(): GraphDocumentModel {
		return this.document
	}

	public getActiveGraphId(): string {
		return this.activeGraphId
	}

	public getActiveRootGraphId(): string {
		return this.activeRootGraphId
	}

	public getActiveModel(): GraphModel {
		return this.document.requireGraph(this.activeGraphId).model
	}

	public openGraph(graphId: string, rootGraphId?: string): boolean {
		if (!this.document.getGraph(graphId)) return false
		const nextRootGraphId = rootGraphId
			? this.document.requireRootGraph(rootGraphId).getGraphId()
			: this.document.isRootGraph(graphId)
				? graphId
				: this.activeRootGraphId
		if (graphId === this.activeGraphId && nextRootGraphId === this.activeRootGraphId) return false
		this.activeRootGraphId = nextRootGraphId
		this.activeGraphId = graphId
		return true
	}

	public setActiveGraph(graphId: string): void {
		this.activeGraphId = this.document.getGraph(graphId)
			? graphId
			: this.document.getDefaultRootGraphId()
		if (this.document.isRootGraph(this.activeGraphId)) this.activeRootGraphId = this.activeGraphId
	}

	public replaceDocument(document: GraphDocumentModel): void {
		this.document = document
		this.activeRootGraphId = document.getDefaultRootGraphId()
		this.activeGraphId = this.activeRootGraphId
	}

	public serialize(): GraphDocument {
		return serializeGraph(this.document, this.nodeRegistry)
	}

	public capture(): GraphStateCheckpoint {
		return {
			document: this.serialize(),
			activeGraphId: this.activeGraphId,
			activeRootGraphId: this.activeRootGraphId,
			documentVersion: this.documentVersion,
		}
	}

	public restore(checkpoint: GraphStateCheckpoint): void {
		this.document = deserializeGraph(checkpoint.document, this.nodeRegistry)
		this.activeRootGraphId = this.document.isRootGraph(checkpoint.activeRootGraphId)
			? checkpoint.activeRootGraphId
			: this.document.getDefaultRootGraphId()
		this.activeGraphId = this.document.getGraph(checkpoint.activeGraphId)
			? checkpoint.activeGraphId
			: this.activeRootGraphId
		this.documentVersion = checkpoint.documentVersion
	}

	public createDocumentVersion(): number {
		const version = this.nextDocumentVersion
		this.nextDocumentVersion += 1
		this.documentVersion = version
		return version
	}

	public publish(affectsEvaluation = true): void {
		this.revision += 1
		if (affectsEvaluation) this.evaluationRevision += 1
		this.snapshot = this.createSnapshot()
		for (const listener of this.listeners) listener()
	}

	private createSnapshot(): GraphStateSnapshot {
		// Published readers must never reference the authoritative mutable document.
		const document = deserializeGraph(this.serialize(), this.nodeRegistry)
		return {
			revision: this.revision,
			evaluationRevision: this.evaluationRevision,
			documentVersion: this.documentVersion,
			document,
			activeGraphId: this.activeGraphId,
			activeRootGraphId: this.activeRootGraphId,
			model: document.requireGraph(this.activeGraphId).model,
		}
	}
}
