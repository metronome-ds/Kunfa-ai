/**
 * Client-side tenant-aware fetch wrapper.
 *
 * In dev mode (no subdomain), middleware resolves the tenant from a
 * ?tenant=<slug> query param. Client-side fetches to /api/tenant/* must
 * forward that param so middleware sets x-tenant-* headers on the request.
 *
 * In production (subdomain-based), the host carries the tenant context
 * and no param is needed — this helper is still safe to use.
 */
export function tenantFetch(input: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') return fetch(input, init);

  const tenantParam = new URLSearchParams(window.location.search).get('tenant');
  if (!tenantParam) return fetch(input, init);

  // Preserve existing query string if any
  const sep = input.includes('?') ? '&' : '?';
  const url = `${input}${sep}tenant=${encodeURIComponent(tenantParam)}`;
  return fetch(url, init);
}
