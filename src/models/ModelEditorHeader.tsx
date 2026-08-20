import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Box } from 'lucide-react'
import type { ReactNode } from 'react'
import { UserMenu } from '@/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Client } from '@/cosntants'
import type { ModelCatalogItem } from '@/models/ModelCatalogItem'
import { ModelSelector } from '@/models/ModelSelector'

export function ModelEditorHeader({
	client,
	models,
	selectedModel,
	modelsLoading,
	navigationDisabled = false,
	actions,
	user,
	onBack,
	onSelectModel,
	onSignOut,
}: {
	client: Client
	models: readonly ModelCatalogItem[]
	selectedModel: ModelCatalogItem | undefined
	modelsLoading: boolean
	navigationDisabled?: boolean
	actions?: ReactNode
	user: User
	onBack: () => void
	onSelectModel: (modelId: string) => void
	onSignOut: () => void
}) {
	return (
		<header
			data-id="model-editor-header"
			className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-3 py-2"
		>
			<div className="flex shrink-0 items-center gap-3">
				<Button
					data-id="model-editor-back"
					type="button"
					size="sm"
					variant="ghost"
					disabled={navigationDisabled}
					onClick={onBack}
				>
					<ArrowLeft />
					Projects
				</Button>
				<div className="flex shrink-0 items-center gap-2">
					<Box className="size-4 text-muted-foreground" aria-hidden="true" />
					<div>
						<h1 className="m-0 text-sm font-semibold">Model editor</h1>
						<p className="m-0 text-xs text-muted-foreground">{clientLabel(client)}</p>
					</div>
				</div>
			</div>
			<ModelSelector
				models={models}
				value={selectedModel?.id}
				disabled={navigationDisabled || modelsLoading || models.length === 0}
				onValueChange={onSelectModel}
			/>
			<div className="ml-auto flex shrink-0 items-center gap-3">
				{actions}
				<UserMenu user={user} disabled={navigationDisabled} onSignOut={onSignOut} />
			</div>
		</header>
	)
}

function clientLabel(client: Client): string {
	return client === Client.MAXSHELF ? 'MaxShelf' : 'Kitchen'
}
