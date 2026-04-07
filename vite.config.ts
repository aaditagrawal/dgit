import path from "node:path"
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"
import type { Plugin } from "vite"

// Only alias crypto/buffer for client builds, not SSR
function clientNodePolyfills(): Plugin {
  return {
    name: "client-node-polyfills",
    config(_, env) {
      if (env.isSsrBuild) return
      return {
        resolve: {
          alias: {
            buffer: "buffer/",
            crypto: path.resolve(__dirname, "src/lib/crypto-shim.ts"),
          },
        },
      }
    },
  }
}

const config = defineConfig({
  plugins: [
    clientNodePolyfills(),
    devtools(),
    nitro(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
