// Minimal crypto shim for isomorphic-git in the browser.
// Only implements createHash (SHA-1/SHA-256) which is all isomorphic-git needs.
import SHA from "sha.js"

class Hash {
  private _hash: ReturnType<typeof SHA>

  constructor(algorithm: string) {
    this._hash = SHA(algorithm)
  }

  update(data: string | Uint8Array | Buffer): this {
    this._hash.update(data)
    return this
  }

  digest(encoding?: string): string | Uint8Array {
    if (encoding === "hex") {
      return this._hash.digest("hex")
    }
    return new Uint8Array(this._hash.digest())
  }
}

export function createHash(algorithm: string): Hash {
  return new Hash(algorithm)
}

export default { createHash }
