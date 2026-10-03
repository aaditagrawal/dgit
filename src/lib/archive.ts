import { gzipSync, Zip, ZipDeflate } from "fflate"

export type ArchiveFormat = "zip" | "tar.gz"

export function createZip(files: Map<string, Uint8Array>): Uint8Array {
  const chunks: Uint8Array[] = []
  const zip = new Zip((error, chunk) => {
    if (error) throw error
    chunks.push(chunk)
  })
  for (const [path, data] of files) {
    const entry = new ZipDeflate(path)
    zip.add(entry)
    entry.push(data, true)
  }
  zip.end()
  const result = new Uint8Array(
    chunks.reduce((size, chunk) => size + chunk.length, 0)
  )
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export function createTarGz(files: Map<string, Uint8Array>): Uint8Array {
  const tar = createTar(files)
  return gzipSync(tar)
}

export function triggerDownload(
  data: Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([new Uint8Array(data)], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// POSIX tar format encoder
function createTar(files: Map<string, Uint8Array>): Uint8Array {
  const encoder = new TextEncoder()
  const entries: Array<{ name: string; data: Uint8Array; type: number }> = []
  for (const [path, data] of files) {
    let name = path
    if (encoder.encode(path).length > 100) {
      const record = `path=${path}\n`
      let length = encoder.encode(record).length + 2
      while (true) {
        const next = encoder.encode(`${length} ${record}`).length
        if (next === length) break
        length = next
      }
      entries.push({
        name: `PaxHeaders/${entries.length}`,
        data: encoder.encode(`${length} ${record}`),
        type: 120,
      })
      name = `PaxFile/${entries.length}`
    }
    entries.push({ name, data, type: 48 })
  }
  let totalSize = 1024 // Two 512-byte zero blocks as EOF
  for (const { data } of entries) {
    totalSize += 512 + Math.ceil(data.length / 512) * 512
  }
  const result = new Uint8Array(totalSize)
  let offset = 0

  for (const { name, data, type } of entries) {
    const header = result.subarray(offset, offset + 512)

    // File name (0-99)
    const nameBytes = encoder.encode(name)
    header.set(nameBytes, 0)

    // File mode (100-107): 0644
    header.set(encoder.encode("0000644\0"), 100)

    // Owner ID (108-115)
    header.set(encoder.encode("0000000\0"), 108)

    // Group ID (116-123)
    header.set(encoder.encode("0000000\0"), 116)

    // File size in octal (124-135)
    const sizeStr = data.length.toString(8).padStart(11, "0") + "\0"
    header.set(encoder.encode(sizeStr), 124)

    // Modification time (136-147)
    const mtime =
      Math.floor(Date.now() / 1000)
        .toString(8)
        .padStart(11, "0") + "\0"
    header.set(encoder.encode(mtime), 136)

    // Type flag (156): '0' = regular file
    header[156] = type

    // USTAR indicator (257-262)
    header.set(encoder.encode("ustar\0"), 257)

    // USTAR version (263-264)
    header.set(encoder.encode("00"), 263)

    // Compute checksum: sum of all bytes with checksum field as spaces
    for (let i = 148; i < 156; i++) {
      header[i] = 32 // space
    }
    let checksum = 0
    for (let i = 0; i < 512; i++) {
      checksum += header[i]
    }
    const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 "
    header.set(encoder.encode(checksumStr), 148)

    offset += 512
    result.set(data, offset)
    offset += Math.ceil(data.length / 512) * 512
  }

  return result
}
