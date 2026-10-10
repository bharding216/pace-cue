/**
 * Admin email allowlist.
 * Set ADMIN_EMAILS env var as a comma-separated list, e.g. "you@example.com,other@example.com"
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;

  const allowlist = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    console.warn('ADMIN_EMAILS is empty — no one can access the dashboard.');
    return false;
  }

  return allowlist.includes(email.toLowerCase());
}
