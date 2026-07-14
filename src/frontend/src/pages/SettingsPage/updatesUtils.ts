export interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string | null
  html_url: string
  prerelease: boolean
}

export interface ChangelogSection {
  title: 'New' | 'Fixed'
  items: string[]
}

const FIXED_HEADER = /^(fixed|fixes|bug\s*fixes?|bugfix|resolved)/i
const SKIP_HEADER = /^(on the roadmap|getting started|what is|thank you|docker|spoolhub agent)/i

function cleanItem(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').trim()
}

function headerTitle(line: string): string | null {
  const hash = line.match(/^#{1,3}\s+(.+)$/)
  if (hash) return hash[1].replace(/[🎉✨🚀🔮🙏]/gu, '').trim()
  const bold = line.match(/^\*\*(.+)\*\*$/)
  if (bold) return bold[1].trim()
  return null
}

export function parseReleaseBody(body: string | null): ChangelogSection[] {
  if (!body?.trim()) return []

  const newItems: string[] = []
  const fixedItems: string[] = []
  let category: 'new' | 'fixed' | 'skip' | null = null
  let inCodeBlock = false

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock || trimmed === '---') continue

    const title = headerTitle(trimmed)
    if (title) {
      if (FIXED_HEADER.test(title)) category = 'fixed'
      else if (SKIP_HEADER.test(title) || /^spoolhub\s+1/i.test(title)) category = 'skip'
      else category = 'new'
      continue
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/)
    if (!bulletMatch || category === 'skip') continue

    const item = cleanItem(bulletMatch[1])
    if (!item) continue

    if (category === 'fixed') fixedItems.push(item)
    else newItems.push(item)
  }

  const sections: ChangelogSection[] = []
  if (newItems.length) sections.push({ title: 'New', items: newItems })
  if (fixedItems.length) sections.push({ title: 'Fixed', items: fixedItems })
  return sections
}

export function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '').split('+')[0].trim()
}

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    normalizeVersion(v)
      .split(/[.-]/)
      .map(part => parseInt(part, 10) || 0)

  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function formatReleaseDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export type ReleaseBadge = 'current' | 'previous' | 'new' | null

export function getReleaseBadge(
  releaseVersion: string,
  currentVersion: string,
  latestVersion: string | null,
): ReleaseBadge {
  const cmpCurrent = compareVersions(releaseVersion, currentVersion)
  if (cmpCurrent === 0) return 'current'
  if (cmpCurrent < 0) return 'previous'
  if (latestVersion && releaseVersion === latestVersion && cmpCurrent > 0) return 'new'
  return null
}
