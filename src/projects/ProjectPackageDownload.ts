import type { GraphDocument } from '@/parametric/model/GraphSerialization'

const PROJECT_PACKAGE_FILE_NAME = 'project.zip'
const METADATA_FILE_NAME = 'metadata.json'
const PROJECT_FILE_NAME = 'project.json'

interface ZipEntry {
	name: string
	contents: Uint8Array
}

export function downloadProjectPackage(
	metadataDocument: Record<string, unknown>,
	projectDocument: GraphDocument
): void {
	const archive = createZip([
		{ name: METADATA_FILE_NAME, contents: encodeJson(metadataDocument) },
		{ name: PROJECT_FILE_NAME, contents: encodeJson(projectDocument) },
	])
	const blobBytes = new Uint8Array(archive.length)
	blobBytes.set(archive)
	const url = URL.createObjectURL(new Blob([blobBytes.buffer], { type: 'application/zip' }))
	const link = document.createElement('a')
	link.href = url
	link.download = PROJECT_PACKAGE_FILE_NAME
	link.click()
	URL.revokeObjectURL(url)
}

function encodeJson(value: unknown): Uint8Array {
	return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)
}

function createZip(entries: readonly ZipEntry[]): Uint8Array {
	const encoder = new TextEncoder()
	const localFiles: Uint8Array[] = []
	const centralDirectory: Uint8Array[] = []
	let offset = 0

	for (const entry of entries) {
		const name = encoder.encode(entry.name)
		const crc = crc32(entry.contents)
		const localFile = new Uint8Array(30 + name.length + entry.contents.length)
		const localView = new DataView(localFile.buffer)
		localView.setUint32(0, 0x04034b50, true)
		localView.setUint16(4, 20, true)
		localView.setUint16(6, 0x0800, true)
		localView.setUint16(8, 0, true)
		localView.setUint32(14, crc, true)
		localView.setUint32(18, entry.contents.length, true)
		localView.setUint32(22, entry.contents.length, true)
		localView.setUint16(26, name.length, true)
		localFile.set(name, 30)
		localFile.set(entry.contents, 30 + name.length)
		localFiles.push(localFile)

		const centralRecord = new Uint8Array(46 + name.length)
		const centralView = new DataView(centralRecord.buffer)
		centralView.setUint32(0, 0x02014b50, true)
		centralView.setUint16(4, 20, true)
		centralView.setUint16(6, 20, true)
		centralView.setUint16(8, 0x0800, true)
		centralView.setUint16(10, 0, true)
		centralView.setUint32(16, crc, true)
		centralView.setUint32(20, entry.contents.length, true)
		centralView.setUint32(24, entry.contents.length, true)
		centralView.setUint16(28, name.length, true)
		centralView.setUint32(42, offset, true)
		centralRecord.set(name, 46)
		centralDirectory.push(centralRecord)
		offset += localFile.length
	}

	const centralDirectorySize = centralDirectory.reduce((size, record) => size + record.length, 0)
	const archive = new Uint8Array(offset + centralDirectorySize + 22)
	let archiveOffset = 0
	for (const localFile of localFiles) {
		archive.set(localFile, archiveOffset)
		archiveOffset += localFile.length
	}
	for (const centralRecord of centralDirectory) {
		archive.set(centralRecord, archiveOffset)
		archiveOffset += centralRecord.length
	}
	const endRecord = new DataView(archive.buffer, archiveOffset, 22)
	endRecord.setUint32(0, 0x06054b50, true)
	endRecord.setUint16(8, entries.length, true)
	endRecord.setUint16(10, entries.length, true)
	endRecord.setUint32(12, centralDirectorySize, true)
	endRecord.setUint32(16, offset, true)
	return archive
}

function crc32(bytes: Uint8Array): number {
	let value = 0xffffffff
	for (const byte of bytes) {
		value ^= byte
		for (let bit = 0; bit < 8; bit += 1) {
			value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0)
		}
	}
	return (value ^ 0xffffffff) >>> 0
}
