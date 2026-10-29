/**
 * Accepts "owner/name", "github.com/owner/name" or a full URL (with or without
 * .git or extra path segments) and returns { owner, repo } or null.
 */
export function parseRepoInput(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const match = cleaned.match(
    /^(?:github\.com\/)?([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]+?)(?:\.git)?(?:[/#?].*)?$/,
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
