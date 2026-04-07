export type ParsedRepo = {
  url: string
  repoName: string
  subpath: string | null
}

// Patterns for tree/blob paths across git hosts
// GitHub:    /user/repo/tree/branch/path
// GitLab:    /user/repo/-/tree/branch/path
// Bitbucket: /user/repo/src/branch/path
const TREE_PATTERNS = [
  /^\/([^/]+\/[^/]+)\/(?:tree|blob)\/[^/]+\/(.+)/,        // GitHub
  /^\/([^/]+\/[^/]+)\/-\/(?:tree|blob)\/[^/]+\/(.+)/,      // GitLab
  /^\/([^/]+\/[^/]+)\/src\/[^/]+\/(.+)/,                    // Bitbucket
]

export function parseRepoUrl(input: string): ParsedRepo {
  let url = input.trim()

  if (!url) {
    throw new Error("Please enter a repository URL")
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Invalid URL format")
  }

  if (!parsed.hostname) {
    throw new Error("Invalid URL: missing hostname")
  }

  // Try to extract subpath from tree/blob URLs
  let subpath: string | null = null
  let repoPath: string | null = null

  for (const pattern of TREE_PATTERNS) {
    const match = parsed.pathname.match(pattern)
    if (match) {
      repoPath = match[1]
      subpath = match[2].replace(/\/$/, "")
      break
    }
  }

  // Build the clean repo URL
  if (repoPath) {
    url = `${parsed.protocol}//${parsed.hostname}/${repoPath}`
  }

  const pathParts = (repoPath ?? parsed.pathname)
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean)

  if (pathParts.length < 2) {
    throw new Error(
      "Invalid repository URL. Expected format: https://github.com/user/repo",
    )
  }

  const repoName = pathParts[pathParts.length - 1]

  if (!url.endsWith(".git")) {
    url = url.replace(/\/$/, "") + ".git"
  }

  return { url, repoName, subpath }
}
