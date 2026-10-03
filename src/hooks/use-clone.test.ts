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
    expect(result.current.status.state).toBe("error")
    expect(result.current.status.error).toBeTruthy()
    expect(dependencies.cloneAndCollect).not.toHaveBeenCalled()
  })
  it("does not reset a second pending clone after the previous completion", async () => {
    vi.mocked(dependencies.cloneAndCollect).mockResolvedValueOnce(new Map())
    const { result } = renderHook(() => useClone(dependencies))
    act(() =>
      result.current.startDownload("https://github.com/user/repo", options)
    )
    await waitFor(() => expect(result.current.status.state).toBe("done"))
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
    expect(result.current.status.state).toBe("cloning")
  })
})
