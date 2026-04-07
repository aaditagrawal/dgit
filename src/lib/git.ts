export type CloneProgress = {
  phase: string
  loaded: number
  total: number
}

export type CloneOptions = {
  url: string
  shallow: boolean
  onProgress?: (progress: CloneProgress) => void
}

const CORS_PROXY = "https://cors.isomorphic-git.org"
const CLONE_DIR = "/repo"

export async function cloneAndCollect(
  options: CloneOptions,
): Promise<Map<string, Uint8Array>> {
  // Dynamic imports to avoid SSR issues - these are browser-only modules
  const [git, { default: http }, { default: LightningFS }] = await Promise.all([
    import("isomorphic-git"),
    import("isomorphic-git/http/web"),
    import("@isomorphic-git/lightning-fs"),
  ])

  // Ensure Buffer polyfill is available
  if (typeof globalThis.Buffer === "undefined") {
    const bufferModule = await import("buffer/")
    Object.defineProperty(globalThis, "Buffer", {
      value: bufferModule.Buffer,
      writable: true,
      configurable: true,
    })
  }

  const fsName = "dgit-" + Date.now()
  const fs = new LightningFS(fsName)
  const pfs = fs.promises

  try {
    await pfs.mkdir(CLONE_DIR)

    await git.clone({
      fs,
      http,
      dir: CLONE_DIR,
      url: options.url,
      corsProxy: CORS_PROXY,
      singleBranch: true,
      depth: options.shallow ? 1 : undefined,
      onProgress(event) {
        options.onProgress?.({
          phase: event.phase,
          loaded: event.loaded,
          total: event.total,
        })
      },
    })

    const files = new Map<string, Uint8Array>()
    await walkFs(pfs, CLONE_DIR, CLONE_DIR, files)
    return files
  } finally {
    fs.init(fsName, { wipe: true })
  }
}

type PromisifiedFS = {
  readdir: (path: string) => Promise<Array<string>>
  stat: (path: string) => Promise<{ isDirectory: () => boolean }>
  readFile: (path: string) => Promise<Uint8Array | string>
}

async function walkFs(
  pfs: PromisifiedFS,
  baseDir: string,
  currentDir: string,
  files: Map<string, Uint8Array>,
): Promise<void> {
  const entries = await pfs.readdir(currentDir)

  for (const entry of entries) {
    if (entry === ".git") continue

    const fullPath = currentDir + "/" + entry
    const stat = await pfs.stat(fullPath)

    if (stat.isDirectory()) {
      await walkFs(pfs, baseDir, fullPath, files)
    } else {
      const data = (await pfs.readFile(fullPath)) as Uint8Array
      const relativePath = fullPath.slice(baseDir.length + 1)
      files.set(relativePath, data)
    }
  }
}
