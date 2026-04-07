export type ParsedRepo = {
  url: string
  repoName: string
}

export function parseRepoUrl(input: string): ParsedRepo {
  let url = input.trim()

  if (!url) {
    throw new Error("Please enter a repository URL")
  }

  // Add protocol if missing
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

  // Extract repo name from path
  const pathParts = parsed.pathname
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean)
  if (pathParts.length < 2) {
    throw new Error(
      "Invalid repository URL. Expected format: https://github.com/user/repo",
    )
  }

  const repoName = pathParts[pathParts.length - 1]

  // Ensure URL ends with .git for isomorphic-git
  if (!url.endsWith(".git")) {
    url = url.replace(/\/$/, "") + ".git"
  }

  return { url, repoName }
}
