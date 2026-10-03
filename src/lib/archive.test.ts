import { execFileSync } from "node:child_process"
import { gunzipSync, Unzip, UnzipInflate } from "fflate"
import { describe, expect, it, vi } from "vitest"
import { createTarGz, createZip } from "./archive"

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

describe("archive filenames", () => {
  it("round trips a root __proto__ ZIP member", () => {
    const data = new Uint8Array([1, 2, 3])
    const extracted = new Map<string, Uint8Array>()
    const unzip = new Unzip((file) => {
      file.ondata = (error, chunk) => {
        if (error) throw error
        extracted.set(file.name, chunk)
      }
      file.start()
    })
    unzip.register(UnzipInflate)
    unzip.push(createZip(new Map([["__proto__", data]])), true)
    expect([...extracted.keys()]).toEqual(["__proto__"])
    expect(extracted.get("__proto__")).toEqual(data)
  })

  it("preserves colliding long and Unicode TAR paths with a standard reader", () => {
    const names = [
      `${"a".repeat(100)}1`,
      `${"a".repeat(100)}2`,
      `${"目录/".repeat(30)}文档.typ`,
    ]
    const files = new Map(
      names.map((name, index) => [name, new Uint8Array([index + 1])])
    )
    const archive = createTarGz(files)
    const listed = execFileSync(
      "tar",
      ["-tzf", "-", "--quoting-style=literal"],
      { input: archive }
    )
      .toString()
      .trim()
      .split("\n")
    expect(listed).toEqual(names)
    for (const [name, bytes] of files) {
      const extracted = execFileSync("tar", ["-xOzf", "-", "--", name], {
        input: archive,
      })
      expect(new Uint8Array(extracted)).toEqual(bytes)
    }
  })
})
