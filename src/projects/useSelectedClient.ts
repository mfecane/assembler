import { useState } from 'react'
import { CLIENT, PROJECT_CONSTANTS, type Client } from '@/constants'

export function useSelectedClient(): [Client, (client: Client) => void] {
	const [selectedClient, setSelectedClient] = useState(readSelectedClient)

	const selectClient = (client: Client) => {
		setSelectedClient(client)
		try {
			window.localStorage.setItem(PROJECT_CONSTANTS.SELECTED_CLIENT_STORAGE_KEY, client)
		} catch (cause) {
			console.error(
				`Failed to persist selected client "${client}" in local storage key `
				+ `"${PROJECT_CONSTANTS.SELECTED_CLIENT_STORAGE_KEY}". The dashboard selection changed for this page load, `
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
		storedClient = window.localStorage.getItem(PROJECT_CONSTANTS.SELECTED_CLIENT_STORAGE_KEY)
	} catch (cause) {
		console.error(
			`Failed to read selected client from local storage key "${PROJECT_CONSTANTS.SELECTED_CLIENT_STORAGE_KEY}". `
			+ `The dashboard will use the default client "${CLIENT.MAXSHELF}" for this page load.`,
			cause
		)
		return CLIENT.MAXSHELF
	}

	if (storedClient === null) return CLIENT.MAXSHELF
	if (isClient(storedClient)) return storedClient

	console.error(
		`Ignored unsupported selected client ${JSON.stringify(storedClient)} from local storage key `
		+ `"${PROJECT_CONSTANTS.SELECTED_CLIENT_STORAGE_KEY}". Supported clients are ${JSON.stringify(Object.values(CLIENT))}; `
		+ `the dashboard will use "${CLIENT.MAXSHELF}".`
	)
	return CLIENT.MAXSHELF
}

function isClient(value: string): value is Client {
	return Object.values(CLIENT).includes(value as Client)
}
