'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Settings, ChevronDown, Check, Building2, Rocket, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Route → Label map
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/deals': 'Deals',
  '/pipeline': 'Pipeline',
  '/services': 'Marketplace',
  '/communities': 'Community',
  '/startups': 'Startups',
  '/investors': 'Investors',
  '/investors-directory': 'Investors',
  '/invitations': 'Invitations',
  '/faq': 'FAQ',
  '/settings': 'Settings',
  '/team': 'Team',
  '/onboarding': 'Founder Onboarding',
  '/companies/new': 'Add Company',
  '/saved-deals': 'Saved Deals',
  '/admin/tenants': 'Tenants',
  '/admin/analytics': 'Analytics',
  '/admin/onboard-startup': 'Onboard Startup',
  '/admin/onboard-investor': 'Onboard Investor',
  '/admin/invitations': 'Invitations',
  '/admin/tenant-analytics': 'Analytics',
};

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/company/')) return 'Company';
  if (pathname.startsWith('/admin/')) return 'Admin';
  return 'Kunfa';
}

// ---------------------------------------------------------------------------
// Entity Switcher types
// ---------------------------------------------------------------------------

interface TeamOption {
  teamId: string;
  ownerName: string;
  companyName: string | null;
  fundName: string | null;
  role: string;
  memberRole: string;
}

interface TeamContext {
  activeTeamId: string | null;
  teamOwnerName: string | null;
  fundName: string | null;
  memberRole: string;
}

// ---------------------------------------------------------------------------
// Entity Switcher
// ---------------------------------------------------------------------------

function EntitySwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<TeamContext | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/team-context')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setContext(d.context);
          setTeams(d.availableTeams || []);
        }
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const switchTo = useCallback(
    async (teamId: string | null) => {
      setSwitching(true);
      try {
        const res = await fetch('/api/team-context/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId }),
        });
        if (res.ok) {
          setOpen(false);
          window.location.href = '/dashboard';
        }
      } catch {
        // ignore
      } finally {
        setSwitching(false);
      }
    },
    [],
  );

  if (!context || teams.length === 0) return null;

  const activeName = context.fundName || context.teamOwnerName || 'Personal';
  const activeId = context.activeTeamId;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition-colors"
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--line)',
          background: open ? 'var(--bg-sunk)' : 'var(--bg-elev)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
          maxWidth: 220,
        }}
      >
        <Building2 size={14} style={{ color: 'var(--ink-mute)', flexShrink: 0 }} />
        <span className="truncate">{activeName}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--ink-mute)',
            flexShrink: 0,
            transition: 'transform 150ms',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50"
          style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            width: 260,
            overflow: 'hidden',
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--ink-mute)',
              padding: '10px 14px 6px',
              fontWeight: 500,
            }}
          >
            Switch entity
          </div>

          {/* Entity list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {teams.map((team) => {
              const isActive = team.teamId === activeId;
              const name = team.fundName || team.companyName || team.ownerName;
              return (
                <button
                  key={team.teamId}
                  onClick={() => !isActive && switchTo(team.teamId)}
                  disabled={switching || isActive}
                  className="flex items-center gap-[10px] w-full text-left transition-colors"
                  style={{
                    padding: '9px 14px',
                    fontSize: 13,
                    color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                    background: isActive ? 'var(--bg-sunk)' : 'transparent',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg-sunk)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    className="grid place-items-center shrink-0"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'var(--accent)' : 'var(--bg-sunk)',
                      border: isActive ? 'none' : '1px solid var(--line)',
                      fontFamily: 'var(--serif)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                    }}
                  >
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--ink-mute)',
                      }}
                    >
                      {team.memberRole}
                    </div>
                  </div>
                  {isActive && <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Divider + create actions */}
          <div style={{ borderTop: '1px solid var(--line)' }}>
            <button
              onClick={() => {
                setOpen(false);
                router.push('/entities/new?type=fund');
              }}
              className="flex items-center gap-[10px] w-full text-left transition-colors"
              style={{ padding: '9px 14px', fontSize: 13, color: 'var(--ink-soft)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-sunk)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={14} style={{ color: 'var(--ink-mute)' }} />
              <span>Create New Fund</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push('/entities/new?type=company');
              }}
              className="flex items-center gap-[10px] w-full text-left transition-colors"
              style={{ padding: '9px 14px', fontSize: 13, color: 'var(--ink-soft)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-sunk)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={14} style={{ color: 'var(--ink-mute)' }} />
              <span>Create New Company</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

export function Topbar() {
  const pathname = usePathname();
  const label = getPageLabel(pathname);

  return (
    <div
      className="flex items-center justify-between sticky top-0 z-10"
      style={{
        padding: '16px var(--page-px)',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        backdropFilter: 'blur(8px)',
        height: 'var(--topbar-h)',
      }}
    >
      {/* Breadcrumbs */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--ink-mute)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Kunfa &nbsp;/&nbsp; <span style={{ color: 'var(--ink)' }}>{label}</span>
      </div>

      {/* Right: search + entity switcher + icon buttons */}
      <div className="flex items-center gap-[14px]">
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--bg-sunk)',
            border: '1px solid var(--line)',
            padding: '7px 12px',
            borderRadius: 6,
            width: 280,
            color: 'var(--ink-mute)',
            fontSize: 12,
          }}
        >
          <Search size={14} />
          <span className="flex-1">Search deals, people, companies...</span>
          <kbd
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              padding: '1px 5px',
              borderRadius: 3,
              color: 'var(--ink-soft)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Entity Switcher */}
        <EntitySwitcher />

        <button
          className="grid place-items-center transition-colors"
          style={{ width: 32, height: 32, borderRadius: 6, color: 'var(--ink-soft)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <Bell size={16} />
        </button>

        <button
          className="grid place-items-center transition-colors"
          style={{ width: 32, height: 32, borderRadius: 6, color: 'var(--ink-soft)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunk)'; e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
