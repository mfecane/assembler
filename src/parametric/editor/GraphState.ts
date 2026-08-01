import type { GraphDocumentModel } from '@/parametric/model/GraphDocumentModel'
import type { GraphModel } from '@/parametric/model/GraphModel'
import {
	deserializeGraph,
	serializeGraph,
	type GraphDocument,
} from '@/parametric/model/GraphSerialization'
import type { NodeRegistry } from '@/parametric/model/NodeDefinition'

export interface GraphStateSnapshot {
	revision: number
	evaluationRevision: number
	documentVersion: number
	document: GraphDocumentModel
	activeGraphId: string
	model: GraphModel
}

export interface GraphStateCheckpoint {
	document: GraphDocument
	activeGraphId: string
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
	private snapshot: GraphStateSnapshot

	public constructor(
		private document: GraphDocumentModel,
		private readonly nodeRegistry: NodeRegistry
	) {
		this.activeGraphId = document.getEntryGraphId()
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

	public getActiveModel(): GraphModel {
		return this.document.requireGraph(this.activeGraphId).model
	}

	public openGraph(graphId: string): boolean {
		if (!this.document.getGraph(graphId) || graphId === this.activeGraphId) return false
		this.activeGraphId = graphId
		return true
	}

	public setActiveGraph(graphId: string): void {
		this.activeGraphId = this.document.getGraph(graphId)
			? graphId
			: this.document.getEntryGraphId()
	}

	public replaceDocument(document: GraphDocumentModel): void {
		this.document = document
		this.activeGraphId = document.getEntryGraphId()
	}

	public serialize(): GraphDocument {
		return serializeGraph(this.document, this.nodeRegistry)
	}

	public capture(): GraphStateCheckpoint {
		return {
			document: this.serialize(),
			activeGraphId: this.activeGraphId,
			documentVersion: this.documentVersion,
		}
	}

	public restore(checkpoint: GraphStateCheckpoint): void {
		this.document = deserializeGraph(checkpoint.document, this.nodeRegistry)
		this.activeGraphId = this.document.getGraph(checkpoint.activeGraphId)
			? checkpoint.activeGraphId
			: this.document.getEntryGraphId()
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
		return {
			revision: this.revision,
			evaluationRevision: this.evaluationRevision,
			documentVersion: this.documentVersion,
			document: this.document,
			activeGraphId: this.activeGraphId,
			model: this.getActiveModel(),
		}
	}
}
