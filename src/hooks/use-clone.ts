import { useCallback, useRef, useState } from "react"
import type { ArchiveFormat } from "@/lib/archive"
import type { CloneProgress } from "@/lib/git"
import type { ParsedRepo } from "@/lib/parse-url"
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

export type SubpathPrompt = {
  subpath: string
  repoName: string
  resolve: (choice: "subfolder" | "full") => void
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
  const [subpathPrompt, setSubpathPrompt] = useState<SubpathPrompt | null>(null)
  const abortRef = useRef(false)

  const executeDownload = useCallback(
    async (
      parsed: ParsedRepo,
      options: CloneDownloadOptions,
      subpath: string | null,
    ) => {
      abortRef.current = false
      setStatus({ state: "cloning", progress: null, error: null, repoName: null })

      try {
        const downloadName = subpath
          ? subpath.split("/").pop() ?? parsed.repoName
          : parsed.repoName

        const files = await cloneAndCollect({
          url: parsed.url,
          shallow: options.shallow,
          subpath,
          onProgress(progress) {
            if (!abortRef.current) {
              setStatus((prev) => ({ ...prev, progress }))
            }
          },
        })

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ref can be mutated concurrently
        if (abortRef.current) return

        setStatus({ state: "archiving", progress: null, error: null, repoName: downloadName })

        let data: Uint8Array
        let filename: string
        let mimeType: string

        if (options.format === "tar.gz") {
          data = createTarGz(files)
          filename = `${downloadName}.tar.gz`
          mimeType = "application/gzip"
        } else {
          data = createZip(files)
          filename = `${downloadName}.zip`
          mimeType = "application/zip"
        }

        triggerDownload(data, filename, mimeType)
        setStatus({ state: "done", progress: null, error: null, repoName: downloadName })

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

  const startDownload = useCallback(
    (rawUrl: string, options: CloneDownloadOptions) => {
      const parsed = parseRepoUrl(rawUrl)

      if (parsed.subpath) {
        setSubpathPrompt({
          subpath: parsed.subpath,
          repoName: parsed.repoName,
          resolve(choice) {
            setSubpathPrompt(null)
            executeDownload(
              parsed,
              options,
              choice === "subfolder" ? parsed.subpath : null,
            )
          },
        })
      } else {
        executeDownload(parsed, options, null)
      }
    },
    [executeDownload],
  )

  const reset = useCallback(() => {
    abortRef.current = true
    setSubpathPrompt(null)
    setStatus({ state: "idle", progress: null, error: null, repoName: null })
  }, [])

  return { status, subpathPrompt, startDownload, reset }
}
