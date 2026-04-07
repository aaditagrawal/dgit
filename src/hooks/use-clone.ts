import { useCallback, useRef, useState } from "react"
import type { ArchiveFormat } from "@/lib/archive"
import type { CloneProgress } from "@/lib/git"
import {
  createTarGz,
  createZip,
  triggerDownload,
} from "@/lib/archive"
import { cloneAndCollect } from "@/lib/git"
import { parseRepoUrl } from "@/lib/parse-url"

export type CloneState = "idle" | "cloning" | "archiving" | "done" | "error"

export type CloneStatus = {
  state: CloneState
  progress: CloneProgress | null
  error: string | null
  repoName: string | null
}

export type CloneDownloadOptions = {
  shallow: boolean
  format: ArchiveFormat
}

function friendlyError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : "An unknown error occurred"

  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("CORS") ||
    message.includes("cors")
  ) {
    return "Network error — the CORS proxy (cors.isomorphic-git.org) may be down or rate-limited. Try again in a moment."
  }

  if (message.includes("404") || message.includes("not found")) {
    return "Repository not found. Make sure the URL is correct and the repo is public."
  }

  if (message.includes("401") || message.includes("403")) {
    return "This repository requires authentication. dgit only supports public repositories."
  }

  return message
}

export function useClone() {
  const [status, setStatus] = useState<CloneStatus>({
    state: "idle",
    progress: null,
    error: null,
    repoName: null,
  })
  const abortRef = useRef(false)

  const startDownload = useCallback(
    async (rawUrl: string, options: CloneDownloadOptions) => {
      abortRef.current = false

      setStatus({ state: "cloning", progress: null, error: null, repoName: null })

      try {
        const { url, repoName } = parseRepoUrl(rawUrl)

        const files = await cloneAndCollect({
          url,
          shallow: options.shallow,
          onProgress(progress) {
            if (!abortRef.current) {
              setStatus((prev) => ({ ...prev, progress }))
            }
          },
        })

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ref can be mutated concurrently
        if (abortRef.current) return

        setStatus({ state: "archiving", progress: null, error: null, repoName })

        let data: Uint8Array
        let filename: string
        let mimeType: string

        if (options.format === "tar.gz") {
          data = createTarGz(files)
          filename = `${repoName}.tar.gz`
          mimeType = "application/gzip"
        } else {
          data = createZip(files)
          filename = `${repoName}.zip`
          mimeType = "application/zip"
        }

        triggerDownload(data, filename, mimeType)
        setStatus({ state: "done", progress: null, error: null, repoName })

        setTimeout(() => {
          if (!abortRef.current) {
            setStatus({ state: "idle", progress: null, error: null, repoName: null })
          }
        }, 8000)
      } catch (err) {
        setStatus({
          state: "error",
          progress: null,
          error: friendlyError(err),
          repoName: null,
        })
      }
    },
    [],
  )

  const reset = useCallback(() => {
    abortRef.current = true
    setStatus({ state: "idle", progress: null, error: null, repoName: null })
  }, [])

  return { status, startDownload, reset }
}
