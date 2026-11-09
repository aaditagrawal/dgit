import type { ArchiveFormat } from "@/lib/archive"
import type { CloneProgress } from "@/lib/git"
import type { ParsedRepo } from "@/lib/parse-url"

export type CloneDownloadOptions = {
  shallow: boolean
  format: ArchiveFormat
}

/**
 * Download lifecycle. Each variant carries only the data that phase can show,
 * so progress, errors, and the subfolder prompt cannot overlap.
 */
export type ClonePhase =
  | { state: "idle" }
  | {
      state: "confirming"
      subpath: string
      repoName: string
      parsed: ParsedRepo
      options: CloneDownloadOptions
    }
  | { state: "cloning"; generation: number; progress: CloneProgress | null }
  | { state: "archiving"; generation: number; repoName: string }
  | { state: "done"; repoName: string }
  | { state: "error"; error: string }

export type CloneEvent =
  | { type: "reset" }
  | { type: "reject"; error: string }
  | {
      type: "confirm"
      subpath: string
      repoName: string
      parsed: ParsedRepo
      options: CloneDownloadOptions
    }
  | { type: "begin"; generation: number }
  | { type: "progress"; generation: number; progress: CloneProgress }
  | { type: "archive"; generation: number; repoName: string }
  | { type: "finish"; generation: number; repoName: string }
  | { type: "fail"; generation: number; error: string }

export const IDLE_PHASE: ClonePhase = { state: "idle" }

export function isDownloadBusy(phase: ClonePhase): boolean {
  return phase.state === "cloning" || phase.state === "archiving"
}

/** Integer percent shown in the UI, or null when the total is still unknown. */
export function progressPercent(progress: CloneProgress | null): number | null {
  if (progress === null || progress.total <= 0) return null
  return Math.round((progress.loaded / progress.total) * 100)
}

function sameProgressTick(prev: CloneProgress, next: CloneProgress): boolean {
  return (
    prev.phase === next.phase && progressPercent(prev) === progressPercent(next)
  )
}

function copyProgress(progress: CloneProgress): CloneProgress {
  return {
    phase: progress.phase,
    loaded: progress.loaded,
    total: progress.total,
  }
}

/**
 * Pure transition function. Returning the previous object means nothing visible
 * changed, so React can skip the render. `generation` drops stale clone work
 * after reset or a newer download.
 */
export function reduceClone(state: ClonePhase, event: CloneEvent): ClonePhase {
  switch (event.type) {
    case "reset":
      return state.state === "idle" ? state : IDLE_PHASE
    case "reject":
      if (isDownloadBusy(state)) return state
      return { state: "error", error: event.error }
    case "confirm":
      if (isDownloadBusy(state)) return state
      return {
        state: "confirming",
        subpath: event.subpath,
        repoName: event.repoName,
        parsed: event.parsed,
        options: event.options,
      }
    case "begin":
      return { state: "cloning", generation: event.generation, progress: null }
    case "progress": {
      if (state.state !== "cloning" || state.generation !== event.generation) {
        return state
      }
      if (
        state.progress !== null &&
        sameProgressTick(state.progress, event.progress)
      ) {
        return state
      }
      return {
        state: "cloning",
        generation: state.generation,
        progress: copyProgress(event.progress),
      }
    }
    case "archive":
      if (state.state !== "cloning" || state.generation !== event.generation) {
        return state
      }
      return {
        state: "archiving",
        generation: event.generation,
        repoName: event.repoName,
      }
    case "finish":
      if (
        state.state !== "archiving" ||
        state.generation !== event.generation
      ) {
        return state
      }
      return { state: "done", repoName: event.repoName }
    case "fail":
      if (
        (state.state !== "cloning" && state.state !== "archiving") ||
        state.generation !== event.generation
      ) {
        return state
      }
      return { state: "error", error: event.error }
  }
}
