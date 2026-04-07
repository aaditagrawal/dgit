# dgit

Download public git repositories as ZIP or TAR.GZ archives, entirely from the browser.

## Why?

I saw many of my friends downloading Git repositories using the browser especially on lab computers in a college and I'm not sure I trust many of these websites, and to top it all off they're extremely slow and ad ridden. For many scenarios that people would use these sites for, you don't need the full git history anyway, just a shallow clone. (Otherwise you'd probably just use the git cli if you could interact with git history.)

(there's also a cool animation so yay!)

## How it works

Paste a repo URL, click download. Uses [isomorphic-git](https://isomorphic-git.org) to clone via a CORS proxy, then packages the files client-side with [fflate](https://github.com/101arrowz/fflate).

No server processing. No backend. Everything runs in your browser.

## Options

- **Format**: ZIP (default) or TAR.GZ
- **Full history**: Off by default (shallow clone, depth 1). Toggle on to include the entire git history.

## Development

```bash
bun install
bun run dev
```

## Stack

TanStack Start, React 19, Tailwind CSS v4, shadcn/ui
