/**
 * The whole authorization model: only the GitHub logins listed in ALLOWED_GITHUB_LOGIN may use this
 * instance. The value is a comma- or space-separated list; matching is exact. Pure, unit-tested.
 */
export function parseAllowedLogins(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedGitHubLogin(profile: unknown, allowed: string | string[]): boolean {
  const list = Array.isArray(allowed) ? allowed : parseAllowedLogins(allowed);
  if (list.length === 0) return false;
  const login = (profile as { login?: unknown } | null | undefined)?.login;
  return typeof login === "string" && list.includes(login);
}
