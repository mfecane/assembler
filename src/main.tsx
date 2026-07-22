import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/css/globals.css'
import { loadMeshRepositoryAssets } from '@/parametric/three/MeshRepository'

async function startApplication() {
	await loadMeshRepositoryAssets()
	const { default: App } = await import('./App')

	ReactDOM.createRoot(document.getElementById('root')!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	)
}

void startApplication()
