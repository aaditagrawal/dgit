// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClone, type CloneDependencies } from "./use-clone"

const dependencies: CloneDependencies = {
  cloneAndCollect: vi.fn(),
  createZip: vi.fn(() => new Uint8Array()),
  createTarGz: vi.fn(() => new Uint8Array()),
  triggerDownload: vi.fn(),
}
afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})
const options = { shallow: true, format: "zip" as const }

describe("clone lifecycle", () => {
  it("shows invalid URL errors without starting a clone", () => {
    const { result } = renderHook(() => useClone(dependencies))
    act(() => result.current.startDownload("https://github.com", options))
    expect(result.current.phase.state).toBe("error")
    if (result.current.phase.state !== "error")
      throw new Error("expected error")
    expect(result.current.phase.error).toBeTruthy()
    expect(dependencies.cloneAndCollect).not.toHaveBeenCalled()
  })

  it("does not reset a second pending clone after the previous completion", async () => {
    vi.mocked(dependencies.cloneAndCollect).mockResolvedValueOnce(new Map())
    const { result } = renderHook(() => useClone(dependencies))
    act(() =>
      result.current.startDownload("https://github.com/user/repo", options)
    )
    await waitFor(() => expect(result.current.phase.state).toBe("done"))
    vi.useFakeTimers()
    vi.mocked(dependencies.cloneAndCollect).mockImplementationOnce(
      () => new Promise(() => {})
    )
    act(() =>
      result.current.startDownload("https://github.com/user/other", options)
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(result.current.phase.state).toBe("cloning")
  })

  it("asks before downloading a subfolder", async () => {
    vi.mocked(dependencies.cloneAndCollect).mockResolvedValueOnce(new Map())
    const { result } = renderHook(() => useClone(dependencies))
    act(() =>
      result.current.startDownload(
        "https://github.com/user/repo/tree/main/docs",
        options
      )
    )
    expect(result.current.phase.state).toBe("confirming")
    if (result.current.phase.state !== "confirming") {
      throw new Error("expected confirming")
    }
    expect(result.current.phase.subpath).toBe("docs")
    expect(dependencies.cloneAndCollect).not.toHaveBeenCalled()

    act(() => result.current.chooseDownload("subfolder"))
    await waitFor(() => expect(result.current.phase.state).toBe("done"))
    expect(dependencies.cloneAndCollect).toHaveBeenCalledWith(
      expect.objectContaining({
        subpath: "docs",
        url: "https://github.com/user/repo.git",
      })
    )
  })

  it("drops a clone that finishes after it was reset", async () => {
    let finishFirst: ((files: Map<string, Uint8Array>) => void) | null = null
    vi.mocked(dependencies.cloneAndCollect).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve
        })
    )
    const { result } = renderHook(() => useClone(dependencies))
    act(() =>
      result.current.startDownload("https://github.com/user/repo", options)
    )
    expect(result.current.phase.state).toBe("cloning")

    act(() => result.current.reset())
    expect(result.current.phase.state).toBe("idle")

    vi.mocked(dependencies.cloneAndCollect).mockImplementationOnce(
      () => new Promise(() => {})
    )
    act(() =>
      result.current.startDownload("https://github.com/user/other", options)
    )
    expect(result.current.phase.state).toBe("cloning")

    await act(async () => {
      finishFirst?.(new Map())
    })
    expect(result.current.phase.state).toBe("cloning")
    expect(dependencies.createZip).not.toHaveBeenCalled()
  })
})
