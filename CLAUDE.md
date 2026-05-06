# CLAUDE.md

Guidance for Claude Code sessions in this repository. Read on startup.

## Schema-first verification

Before writing or modifying any code that queries a database table, verify the table and its columns exist via Supabase MCP. If the schema does not match what the code expects, stop and report — do not proceed under the assumption that you'll add a migration "later."

## Session protocol

Before claiming a task is complete:

1. List files modified, created, or deleted.
2. List database tables or columns changed (if any). Migrations must be shown before running.
3. List Playwright tests added or modified.
4. If any item was deferred, state it explicitly. Do not claim "done" if you skipped any of the above.
5. If the task expanded beyond original scope, stop and report — do not silently proceed.

## Known fragile areas

- `?tenant=slug` query-param routing is a workaround for the Vercel wildcard subdomain blocker. Do not refactor this assuming subdomains work in production — they don't yet.
- `entity-context.ts` and `tenant-context.ts` use service role from user-facing paths intentionally (avoid circular RLS). Do not "fix" these to use user session client.
- `team_members` table is deprecated but has 9 historical rows. Do not delete without migration plan.
- Multiple foreign keys to `profiles` on `entity_members` (and likely other tables) require explicit FK hint in PostgREST queries: `profiles:profiles!entity_members_user_id_fkey!inner(...)`. Unqualified `profiles:profiles!inner` returns PGRST201.

## Do not delete without explicit instruction

- `src/lib/team-context.ts` — deprecated but still called by `permissions.ts`. Removal requires migrating permissions.ts first.
- The `?tenant=slug` query param middleware handler — workaround for active Vercel blocker.
- `team_members` table.

## Linear workflow

- Every meaningful change should map to a KUN-XXX ticket.
- Commit messages reference the ticket: `KUN-123: Add subscription grant idempotency`.
- Playwright tests use the Linear-integrated reporter to map tests to tickets.
- If asked to do non-trivial work without a ticket, ask for one before starting.

## KIRA naming dropped

"KIRA" branding has been dropped. Refer to the AI scoring engine as "the AI scoring engine" or "the scoring engine" — not KIRA. Do not introduce KIRA naming in commit messages, comments, UI copy, or documentation.
