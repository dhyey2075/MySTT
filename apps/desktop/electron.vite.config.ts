import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dirname = dirname(fileURLToPath(import.meta.url))

const ipcContract = resolve(_dirname, '../../packages/ipc-contract/src/index.ts')
const corePipeline = resolve(_dirname, '../../packages/core-pipeline/src/index.ts')
const ui = resolve(_dirname, '../../packages/ui/src/index.tsx')

const bundledWorkspaceDeps = ['@mystt/ipc-contract', '@mystt/core-pipeline']

export default defineConfig({
  main: {
    /* Workspace packages must be bundled: package exports point at .ts and Node cannot load them. */
    plugins: [externalizeDepsPlugin({ exclude: bundledWorkspaceDeps })],
    resolve: {
      alias: {
        '@mystt/ipc-contract': ipcContract,
        '@mystt/core-pipeline': corePipeline,
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@mystt/ipc-contract'] })],
    resolve: {
      alias: {
        '@mystt/ipc-contract': ipcContract,
      },
    },
  },
  renderer: {
    publicDir: resolve(_dirname, 'public'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(_dirname, 'src/renderer/index.html'),
          capture: resolve(_dirname, 'src/renderer/capture.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@mystt/ipc-contract': ipcContract,
        '@mystt/ui': ui,
      },
    },
    plugins: [react()],
  },
})
