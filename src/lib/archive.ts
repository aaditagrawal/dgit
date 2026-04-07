import { gzipSync, zipSync } from "fflate"

export type ArchiveFormat = "zip" | "tar.gz"

export function createZip(files: Map<string, Uint8Array>): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const [path, data] of files) {
    entries[path] = data
  }
  return zipSync(entries)
}

export function createTarGz(files: Map<string, Uint8Array>): Uint8Array {
  const tar = createTar(files)
  return gzipSync(tar)
}

export function triggerDownload(
  data: Uint8Array,
  filename: string,
  mimeType: string,
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
  const blocks: Array<Uint8Array> = []

  for (const [path, data] of files) {
    const header = new Uint8Array(512)
    const encoder = new TextEncoder()

    // File name (0-99)
    const nameBytes = encoder.encode(path)
    header.set(nameBytes.slice(0, 100), 0)

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
      Math.floor(Date.now() / 1000).toString(8).padStart(11, "0") + "\0"
    header.set(encoder.encode(mtime), 136)

    // Type flag (156): '0' = regular file
    header[156] = 48 // ASCII '0'

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

    blocks.push(header)

    // File data padded to 512-byte blocks
    if (data.length > 0) {
      const paddedSize = Math.ceil(data.length / 512) * 512
      const paddedData = new Uint8Array(paddedSize)
      paddedData.set(data)
      blocks.push(paddedData)
    }
  }

  // Two 512-byte zero blocks as EOF
  blocks.push(new Uint8Array(1024))

  // Concatenate all blocks
  const totalSize = blocks.reduce((sum, b) => sum + b.length, 0)
  const result = new Uint8Array(totalSize)
  let offset = 0
  for (const block of blocks) {
    result.set(block, offset)
    offset += block.length
  }
  return result
}
