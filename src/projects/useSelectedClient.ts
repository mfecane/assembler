import { useState } from 'react'
import { Client } from '@/cosntants'

const SELECTED_CLIENT_STORAGE_KEY = 'assembler.selected-client'

export function useSelectedClient(): [Client, (client: Client) => void] {
	const [selectedClient, setSelectedClient] = useState(readSelectedClient)

	const selectClient = (client: Client) => {
		setSelectedClient(client)
		try {
			window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, client)
		} catch (cause) {
			console.error(
				`Failed to persist selected client "${client}" in local storage key `
				+ `"${SELECTED_CLIENT_STORAGE_KEY}". The dashboard selection changed for this page load, `
				+ 'but it will not survive a refresh.',
				cause
			)
		}
	}

	return [selectedClient, selectClient]
}

function readSelectedClient(): Client {
	let storedClient: string | null
	try {
		storedClient = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY)
	} catch (cause) {
		console.error(
			`Failed to read selected client from local storage key "${SELECTED_CLIENT_STORAGE_KEY}". `
			+ `The dashboard will use the default client "${Client.MAXSHELF}" for this page load.`,
			cause
		)
		return Client.MAXSHELF
	}

	if (storedClient === null) return Client.MAXSHELF
	if (isClient(storedClient)) return storedClient

	console.error(
		`Ignored unsupported selected client ${JSON.stringify(storedClient)} from local storage key `
		+ `"${SELECTED_CLIENT_STORAGE_KEY}". Supported clients are ${JSON.stringify(Object.values(Client))}; `
		+ `the dashboard will use "${Client.MAXSHELF}".`
	)
	return Client.MAXSHELF
}

function isClient(value: string): value is Client {
	return Object.values(Client).includes(value as Client)
}
