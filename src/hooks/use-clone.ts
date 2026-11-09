import { useCallback, useRef, useState } from "react"
import type { ParsedRepo } from "@/lib/parse-url"
import {
  IDLE_PHASE,
  isDownloadBusy,
  reduceClone,
  type CloneDownloadOptions,
  type CloneEvent,
  type ClonePhase,
} from "@/lib/clone-machine"
import { parseRepoUrl } from "@/lib/parse-url"

export type { CloneDownloadOptions, ClonePhase }

function friendlyError(message: string): string {
  if (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("CORS") ||
    message.includes("cors")
  ) {
    return "Network error — the CORS proxy may be down or rate-limited. Try again in a moment."
  }

  if (
    message.includes("Path") &&
    message.includes("not found in the repository")
  ) {
    return message
  }

  if (message.includes("404") || message.includes("not found")) {
    return "Repository not found. Make sure the URL is correct and the repo is public."
  }

  if (message.includes("401") || message.includes("403")) {
    return "This repository requires authentication. dgit only supports public repositories."
  }

  return message
}

export type CloneDependencies = {
  cloneAndCollect: typeof import("@/lib/git").cloneAndCollect
  createTarGz: typeof import("@/lib/archive").createTarGz
  createZip: typeof import("@/lib/archive").createZip
  triggerDownload: typeof import("@/lib/archive").triggerDownload
}

let runtime: Promise<CloneDependencies> | null = null

/** Load the archive and git engines. Safe to call more than once. */
export function preloadDownloadRuntime(): Promise<CloneDependencies> {
  runtime ??= (async () => {
    const gitPromise = import("@/lib/git")
    const archivePromise = import("@/lib/archive")
    const git = await gitPromise
    const warm = git.preloadCloneRuntime()
    const archive = await archivePromise
    await warm
    return {
      cloneAndCollect: git.cloneAndCollect,
      createTarGz: archive.createTarGz,
      createZip: archive.createZip,
      triggerDownload: archive.triggerDownload,
    }
  })()
  return runtime
}

export function useClone(dependencies?: CloneDependencies) {
  const [phase, setPhase] = useState<ClonePhase>(IDLE_PHASE)
  const phaseRef = useRef<ClonePhase>(IDLE_PHASE)
  const generationRef = useRef(0)

  const dispatch = useCallback((event: CloneEvent) => {
    setPhase((current) => {
      const next = reduceClone(current, event)
      phaseRef.current = next
      return next
    })
  }, [])

  const runDownload = useCallback(
    async (
      parsed: ParsedRepo,
      options: CloneDownloadOptions,
      subpath: string | null
    ) => {
      const generation = generationRef.current + 1
      generationRef.current = generation
      dispatch({ type: "begin", generation })

      try {
        const tools = dependencies ?? (await preloadDownloadRuntime())
        const downloadName = subpath
          ? (subpath.split("/").pop() ?? parsed.repoName)
          : parsed.repoName

        const files = await tools.cloneAndCollect({
          url: parsed.url,
          shallow: options.shallow,
          subpath,
          onProgress(progress) {
            dispatch({ type: "progress", generation, progress })
          },
        })

        if (generationRef.current !== generation) return

        dispatch({ type: "archive", generation, repoName: downloadName })

        let data: Uint8Array
        let filename: string
        let mimeType: string

        if (options.format === "tar.gz") {
          data = tools.createTarGz(files)
          filename = `${downloadName}.tar.gz`
          mimeType = "application/gzip"
        } else {
          data = tools.createZip(files)
          filename = `${downloadName}.zip`
          mimeType = "application/zip"
        }

        if (generationRef.current !== generation) return

        tools.triggerDownload(data, filename, mimeType)
        dispatch({ type: "finish", generation, repoName: downloadName })
      } catch (err) {
        if (generationRef.current !== generation) return
        const message =
          err instanceof Error ? err.message : "An unknown error occurred"
        dispatch({ type: "fail", generation, error: friendlyError(message) })
      }
    },
    [dependencies, dispatch]
  )

  const startDownload = useCallback(
    (rawUrl: string, options: CloneDownloadOptions) => {
      if (isDownloadBusy(phaseRef.current)) return

      let parsed: ParsedRepo
      try {
        parsed = parseRepoUrl(rawUrl)
      } catch (err) {
        dispatch({
          type: "reject",
          error: err instanceof Error ? err.message : "Invalid repository URL",
        })
        return
      }

      if (parsed.subpath) {
        dispatch({
          type: "confirm",
          subpath: parsed.subpath,
          repoName: parsed.repoName,
          parsed,
          options,
        })
        return
      }

      void runDownload(parsed, options, null)
    },
    [dispatch, runDownload]
  )

  const chooseDownload = useCallback(
    (choice: "subfolder" | "full") => {
      const current = phaseRef.current
      if (current.state !== "confirming") return
      void runDownload(
        current.parsed,
        current.options,
        choice === "subfolder" ? current.subpath : null
      )
    },
    [runDownload]
  )

  const reset = useCallback(() => {
    generationRef.current += 1
    dispatch({ type: "reset" })
  }, [dispatch])

  return { phase, startDownload, chooseDownload, reset }
}
