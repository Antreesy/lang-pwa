// Build again after each change and serve the build, with the service worker.
// `npm run dev` has no service worker, so use this to test offline mode and the update toast.
// Usage: npm run preview:watch
import { build, preview } from 'vite'

let server
const watcher = await build({ build: { watch: {} } })
watcher.on('event', async e => {
  if (e.code === 'ERROR') console.error(e.error)
  // Start the server after the first build, so that dist/ is complete.
  if (e.code === 'END' && !server) {
    server = await preview()
    server.printUrls()
  }
})
