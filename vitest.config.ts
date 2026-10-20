import { defineConfig } from "vitest/config"

// Unit tests do not need the application server or deployment plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
})
