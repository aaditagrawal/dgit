declare module "sha.js" {
  interface HashInstance {
    update(data: string | Uint8Array | Buffer): HashInstance
    digest(): Buffer
    digest(encoding: "hex"): string
  }

  function SHA(algorithm: string): HashInstance
  export = SHA
}
