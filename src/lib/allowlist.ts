/** The whole authorization model: exactly one GitHub login may use this instance. Pure, unit-tested. */
export function isAllowedGitHubLogin(profile: unknown, allowed: string): boolean {
  if (!allowed) return false;
  const login = (profile as { login?: unknown } | null | undefined)?.login;
  return typeof login === "string" && login === allowed;
}
