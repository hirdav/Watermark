/** Comma-separated list of emails allowed into /dashboard/admin/*, set via the ADMIN_EMAILS env var. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
