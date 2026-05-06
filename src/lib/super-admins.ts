// KUN-41: Super admins are a tightly-scoped allowlist that gates access to
// the analytics dashboard and any other platform-wide tooling. Regular
// `profiles.is_admin` users get claims + imports; super admins additionally
// get analytics.
export const SUPER_ADMIN_EMAILS: ReadonlyArray<string> = [
  'daanish@metronome.ltd',
  'ds@kunfa.ai',
  'daanish12345@gmail.com',
  'rd@vitality.capital',
]

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim())
}
