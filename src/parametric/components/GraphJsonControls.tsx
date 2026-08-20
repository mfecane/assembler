import { useRef, useState } from 'react'
import { ChevronDown, Download, FileJson, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import type { EditorController } from '@/parametric/editor/EditorController'

export function GraphJsonControls({ controller }: { controller: EditorController }) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [menuOpen, setMenuOpen] = useState(false)

	const handleExport = () => {
		downloadJson(JSON.stringify(controller.exportGraph(), null, 2), 'assembly.json')
		setMenuOpen(false)
	}

	const downloadJson = (json: string, fileName: string) => {
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = fileName
		link.click()
		URL.revokeObjectURL(url)
	}

	const handleImport = async (file: File | undefined) => {
		if (!file) return
		try {
			controller.importGraph(JSON.parse(await file.text()))
		} catch (cause) {
			const reason = cause instanceof Error
				? `${cause.name}: ${cause.message}${cause.stack ? `\n${cause.stack}` : ''}`
				: String(cause)
			const error = [
				`Could not import assembly JSON from "${file.name}"`,
				`(${file.size} bytes, type: ${file.type || 'unknown'}).`,
				reason,
			].join(' ')
			console.error(error, {
				cause,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			})
			window.alert(error)
		}
	}

	return (
		<Tooltip>
			<Popover open={menuOpen} onOpenChange={setMenuOpen}>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button
							data-id="graph-file-menu-button"
							type="button"
							variant="ghost"
							size="icon"
							className="nodrag nopan relative h-8 w-8 text-muted-foreground"
							aria-label="Open import and export menu"
						>
							<FileJson />
							<ChevronDown
								className="absolute bottom-0.5 right-0.5 !size-2.5 text-muted-foreground"
								aria-hidden="true"
							/>
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<PopoverContent
					data-id="graph-file-menu"
					align="end"
					className="nodrag nopan w-64 p-1"
				>
					<div className="flex flex-col" role="menu" aria-label="Assembly file actions">
						<Button
							data-id="import-graph-json-button"
							type="button"
							variant="ghost"
							className="h-9 justify-start px-2 font-normal"
							role="menuitem"
							onClick={() => {
								fileInputRef.current?.click()
								setMenuOpen(false)
							}}
						>
							<Upload />
							Import assembly JSON
						</Button>
						<Button
							data-id="export-graph-json-button"
							type="button"
							variant="ghost"
							className="h-9 justify-start px-2 font-normal"
							role="menuitem"
							onClick={handleExport}
						>
							<Download />
							Export assembly JSON
						</Button>
					</div>
				</PopoverContent>
				<Input
					ref={fileInputRef}
					data-id="import-graph-json-input"
					type="file"
					accept="application/json,.json"
					className="hidden"
					onChange={(event) => {
						void handleImport(event.target.files?.[0])
						event.target.value = ''
					}}
				/>
			</Popover>
			<TooltipContent side="top">Import or export files</TooltipContent>
		</Tooltip>
	)
}
