/**
 * Admin utilities
 * Admin users are configured via NEXT_PUBLIC_ADMIN_USER_IDS environment variable
 * (comma-separated list of user IDs)
 */

export function getAdminUserIds(): string[] {
  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || ''
  return adminIds.split(',').map(id => id.trim()).filter(Boolean)
}

export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false
  const adminIds = getAdminUserIds()
  return adminIds.includes(userId)
}
