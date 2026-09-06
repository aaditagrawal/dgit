import { gunzipSync } from "fflate"
import { describe, expect, it, vi } from "vitest"
import { createTarGz } from "./archive"

describe("createTarGz", () => {
  it("writes aligned entries, checksums, and zero padding without changing inputs", () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000)
    try {
      const files = new Map([
        ["empty", new Uint8Array(0)],
        ["one", new Uint8Array([42])],
        ["almost-aligned", new Uint8Array(511).fill(5)],
        ["nested/file", new Uint8Array([1, 2, 3])],
        ["aligned", new Uint8Array(512).fill(7)],
        ["unaligned", new Uint8Array(513).fill(9)],
      ])
      const tar = gunzipSync(createTarGz(files))
      const decoder = new TextDecoder()
      let offset = 0
      for (const [name, data] of files) {
        const header = tar.subarray(offset, offset + 512)
        expect(decoder.decode(header.subarray(0, name.length))).toBe(name)
        expect(parseInt(decoder.decode(header.subarray(124, 135)), 8)).toBe(
          data.length
        )
        const checksum = parseInt(decoder.decode(header.subarray(148, 154)), 8)
        const expectedChecksum = header.reduce(
          (sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte),
          0
        )
        expect(checksum).toBe(expectedChecksum)
        offset += 512
        expect(tar.subarray(offset, offset + data.length)).toEqual(data)
        const paddedLength = Math.ceil(data.length / 512) * 512
        expect(
          tar
            .subarray(offset + data.length, offset + paddedLength)
            .every((byte) => byte === 0)
        ).toBe(true)
        offset += paddedLength
      }
      expect(tar.subarray(offset)).toEqual(new Uint8Array(1024))
      expect(files.get("unaligned")).toEqual(new Uint8Array(513).fill(9))
    } finally {
      vi.restoreAllMocks()
    }
  })

  it("encodes an empty archive as two zero blocks", () => {
    expect(gunzipSync(createTarGz(new Map()))).toEqual(new Uint8Array(1024))
  })
})
