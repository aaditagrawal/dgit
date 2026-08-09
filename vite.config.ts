import path from "node:path"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"
import type { Plugin } from "vite"

const isomorphicGitBrowserEntry = path.resolve(
  import.meta.dirname,
  "node_modules/isomorphic-git/index.js"
)
const bufferBrowserEntry = path.resolve(
  import.meta.dirname,
  "node_modules/buffer/index.js"
)

// Client builds: force isomorphic-git's ESM browser entry (Web Crypto + sha.js
// fallback) and the npm `buffer` polyfill. Avoid Node builtins / index.cjs.
function clientBrowserGit(): Plugin {
  return {
    name: "client-browser-git",
    config(_, env) {
      if (env.isSsrBuild) return
      return {
        resolve: {
          alias: [
            {
              find: /^isomorphic-git$/,
              replacement: isomorphicGitBrowserEntry,
            },
            {
              find: /^buffer\/?$/,
              replacement: bufferBrowserEntry,
            },
          ],
        },
      }
    },
  }
}

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    clientBrowserGit(),
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
