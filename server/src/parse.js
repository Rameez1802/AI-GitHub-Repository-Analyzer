/** Accepts owner/name, github.com/owner/name or a full URL. Returns { owner, repo } or null. */
export function parseRepoInput(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const m = cleaned.match(/^(?:github\.com\/)?([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]+?)(?:\.git)?(?:[/#?].*)?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}
