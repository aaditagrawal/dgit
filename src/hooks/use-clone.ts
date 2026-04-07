import { useState, useCallback, useRef } from "react"
import { parseRepoUrl } from "@/lib/parse-url"
import { cloneAndCollect, type CloneProgress } from "@/lib/git"
import {
  createZip,
  createTarGz,
  triggerDownload,
  type ArchiveFormat,
} from "@/lib/archive"

export type CloneState = "idle" | "cloning" | "archiving" | "done" | "error"

export type CloneStatus = {
  state: CloneState
  progress: CloneProgress | null
  error: string | null
}

export type CloneDownloadOptions = {
  shallow: boolean
  format: ArchiveFormat
}

export function useClone() {
  const [status, setStatus] = useState<CloneStatus>({
    state: "idle",
    progress: null,
    error: null,
  })
  const abortRef = useRef(false)

  const startDownload = useCallback(
    async (rawUrl: string, options: CloneDownloadOptions) => {
      abortRef.current = false

      setStatus({ state: "cloning", progress: null, error: null })

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

        if (abortRef.current) return

        setStatus({ state: "archiving", progress: null, error: null })

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

        setStatus({ state: "done", progress: null, error: null })

        // Reset to idle after a moment
        setTimeout(() => {
          if (!abortRef.current) {
            setStatus({ state: "idle", progress: null, error: null })
          }
        }, 3000)
      } catch (err) {
        if (!abortRef.current) {
          const message =
            err instanceof Error ? err.message : "An unknown error occurred"
          setStatus({ state: "error", progress: null, error: message })
        }
      }
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current = true
    setStatus({ state: "idle", progress: null, error: null })
  }, [])

  return { status, startDownload, reset }
}
