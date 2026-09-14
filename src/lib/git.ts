export type CloneProgress = {
  phase: string
  loaded: number
  total: number
}

export type CloneOptions = {
  url: string
  shallow: boolean
  subpath?: string | null
  onProgress?: (progress: CloneProgress) => void
}

const CORS_PROXY = "https://dgit-cors-proxy.spanner.workers.dev"
const CLONE_DIR = "/repo"

async function ensureBuffer(): Promise<void> {
  if (globalThis.Buffer !== undefined) return

  const { Buffer } = await import("buffer")
  Object.defineProperty(globalThis, "Buffer", {
    value: Buffer,
    writable: true,
    configurable: true,
  })
}

export async function cloneAndCollect(
  options: CloneOptions
): Promise<Map<string, Uint8Array>> {
  // Buffer must exist before isomorphic-git runs (ESM build checks global Buffer).
  await ensureBuffer()

  // Dynamic imports to avoid SSR issues - these are browser-only modules
  const [git, { default: http }, { default: LightningFS }] = await Promise.all([
    import("isomorphic-git"),
    import("isomorphic-git/http/web"),
    import("@isomorphic-git/lightning-fs"),
  ])

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
    const walkRoot = options.subpath
      ? CLONE_DIR + "/" + options.subpath
      : CLONE_DIR

    try {
      await pfs.stat(walkRoot)
    } catch {
      throw new Error(`Path "${options.subpath}" not found in the repository`)
    }

    await walkFs(pfs, walkRoot, walkRoot, files)
    return files
  } finally {
    fs.init(fsName, { wipe: true })
  }
}

type PromisifiedFS = {
  readdir: (path: string) => Promise<Array<string>>
  stat: (path: string) => Promise<{ isDirectory: () => boolean }>
  readFile: (path: string) => Promise<Uint8Array>
}

async function walkFs(
  pfs: PromisifiedFS,
  baseDir: string,
  currentDir: string,
  files: Map<string, Uint8Array>
): Promise<void> {
  const entries = await pfs.readdir(currentDir)

  for (const entry of entries) {
    if (entry === ".git") continue

    const fullPath = currentDir + "/" + entry
    const stat = await pfs.stat(fullPath)

    if (stat.isDirectory()) {
      await walkFs(pfs, baseDir, fullPath, files)
    } else {
      const data = await pfs.readFile(fullPath)
      const relativePath = fullPath.slice(baseDir.length + 1)
      files.set(relativePath, data)
    }
  }
}
