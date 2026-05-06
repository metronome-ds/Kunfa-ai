'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Store,
  MessageCircle,
  Rocket,
  Users,
  Mail,
  HelpCircle,
  FolderTree,
  Shield,
  Wallet,
  Settings,
  LogOut,
  BarChart3,
  PlusCircle,
  UserPlus,
  Ticket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSuperAdmin } from '@/lib/super-admins';
import { canAccessFeature } from '@/lib/subscription';
import { useTenant } from '@/components/TenantProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  requiredTier?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTenantParam(path: string, tenantParam: string | null): string {
  if (!tenantParam) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}tenant=${encodeURIComponent(tenantParam)}`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Navigation definitions
// ---------------------------------------------------------------------------

const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/dashboard' },
  { label: 'Deals', icon: <Briefcase size={15} />, href: '/deals' },
  { label: 'Marketplace', icon: <Store size={15} />, href: '/services' },
  { label: 'Community', icon: <MessageCircle size={15} />, href: '/communities' },
  { label: 'Startups', icon: <Rocket size={15} />, href: '/startups' },
  { label: 'Investors', icon: <Users size={15} />, href: '/investors' },
  { label: 'Invitations', icon: <Mail size={15} />, href: '/invitations' },
  { label: 'FAQ', icon: <HelpCircle size={15} />, href: '/faq' },
];

const JOIN_NAV: NavItem[] = [
  { label: 'Founder Onboarding', icon: <FolderTree size={15} />, href: '/onboarding' },
  { label: 'Join as Investor', icon: <Shield size={15} />, href: '/join-investor' },
];

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { tenant, isTenantContext } = useTenant();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userTier, setUserTier] = useState('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantParam, setTenantParam] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTenantParam(new URLSearchParams(window.location.search).get('tenant'));
  }, [pathname]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_admin, full_name')
            .eq('user_id', user.id)
            .single();

          setUserRole(profile?.role || 'investor');
          setIsAdmin(profile?.is_admin === true);
          setIsSuperAdminUser(isSuperAdmin(user.email));
          setUserName(profile?.full_name || null);
          setUserEmail(user.email || null);

          try {
            const tierRes = await fetch('/api/subscription');
            if (tierRes.ok) {
              const tierData = await tierRes.json();
              setUserTier(tierData.tier || 'free');
            }
          } catch { /* default free */ }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setUserRole('investor');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  // Tenant admin check — isolated effect
  useEffect(() => {
    if (!isTenantContext || !tenant?.id) {
      setIsTenantAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tp = params.get('tenant');
        const url = tp ? `/api/tenant/admin-check?tenant=${encodeURIComponent(tp)}` : '/api/tenant/admin-check';
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setIsTenantAdmin(!!d.isAdmin);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [isTenantContext, tenant?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Build navigation for tenant context
  const tenantFeatures = tenant?.features || {};
  const tenantNavItems: NavItem[] = isTenantContext
    ? (() => {
        const items: NavItem[] = [
          { label: 'Dashboard', icon: <LayoutDashboard size={15} />, href: '/dashboard' },
        ];
        if (tenantFeatures.deals_browse !== false)
          items.push({ label: 'Deals', icon: <Briefcase size={15} />, href: '/deals' });
        if (tenantFeatures.startup_directory !== false)
          items.push({ label: 'Startups', icon: <Rocket size={15} />, href: '/startups' });
        if (tenantFeatures.investor_directory !== false)
          items.push({ label: 'Investors', icon: <Users size={15} />, href: '/investors-directory' });
        return items;
      })()
    : [];

  const tenantManageItems: NavItem[] = isTenantContext && isTenantAdmin
    ? (() => {
        const items: NavItem[] = [];
        if (tenantFeatures.onboard_startup !== false)
          items.push({ label: 'Onboard Startup', icon: <PlusCircle size={15} />, href: '/admin/onboard-startup' });
        if (tenantFeatures.onboard_investor !== false)
          items.push({ label: 'Onboard Investor', icon: <UserPlus size={15} />, href: '/admin/onboard-investor' });
        if (tenantFeatures.invitation_codes !== false)
          items.push({ label: 'Invitations', icon: <Ticket size={15} />, href: '/admin/invitations' });
        items.push({ label: 'Analytics', icon: <BarChart3 size={15} />, href: '/admin/tenant-analytics' });
        return items;
      })()
    : [];

  const displayName = isTenantContext
    ? (tenant?.display_name || tenant?.name || 'Kunfa')
    : 'Kunfa';

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  const initials = userName ? getInitials(userName) : 'U';
  const roleLabel = isTenantAdmin ? 'Admin' : userRole === 'investor' ? 'Investor' : userRole === 'founder' || userRole === 'startup' ? 'Founder' : 'Member';

  // ── Render ────────────────────────────────────────────────────────────

  const navItems = isTenantContext ? tenantNavItems : PRIMARY_NAV;

  return (
    <aside
      className="flex flex-col sticky top-0 h-screen"
      style={{
        width: collapsed ? 64 : 'var(--sidebar-w)',
        background: 'var(--ink)',
        color: '#e8e7e0',
        borderRight: '1px solid var(--ink)',
        transition: 'width 200ms',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-[11px]"
        style={{
          padding: collapsed ? '22px 16px 18px' : '22px 22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link href={withTenantParam('/dashboard', tenantParam)} className="flex items-center gap-[11px] hover:opacity-90 transition-opacity">
          {isTenantContext && tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={displayName} className="h-7 w-7 object-contain rounded" />
          ) : (
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 28, height: 28,
                background: 'var(--accent)',
                borderRadius: 4,
                fontFamily: 'var(--serif)',
                fontWeight: 500,
                color: 'var(--ink)',
                fontSize: 17,
                lineHeight: 1,
              }}
            >
              K
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col gap-[2px]">
              <span style={{ fontFamily: 'var(--serif)', fontSize: 19, letterSpacing: '-0.01em', color: '#f4f3ee', lineHeight: 1 }}>
                {displayName}
              </span>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,231,224,0.45)' }}>
                Venture Intelligence
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 flex flex-col gap-[2px] overflow-y-auto"
        style={{ padding: collapsed ? '18px 8px' : '18px 12px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'rgba(232,231,224,0.3)' }} />
          </div>
        ) : (
          <>
            {navItems.map((item) => {
              const active = isActive(item.href);
              const href = withTenantParam(item.href, tenantParam);
              return (
                <Link
                  key={item.label}
                  href={href}
                  className="flex items-center gap-[10px] w-full text-left transition-[background,color]"
                  style={{
                    padding: collapsed ? '8px' : '8px 10px',
                    borderRadius: 5,
                    fontSize: 13,
                    color: active ? '#f4f3ee' : 'rgba(232,231,224,0.72)',
                    background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                    justifyContent: collapsed ? 'center' : undefined,
                    transitionDuration: '120ms',
                  }}
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = '#f4f3ee';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                    if (!active) e.currentTarget.style.color = 'rgba(232,231,224,0.72)';
                  }}
                >
                  <span className="shrink-0" style={{ opacity: 0.85 }}>{item.icon}</span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span
                      className="shrink-0"
                      style={{
                        fontSize: 10, fontWeight: 500,
                        background: 'var(--accent)', color: 'var(--ink)',
                        padding: '1px 6px', borderRadius: 99,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Tenant MANAGE section */}
            {isTenantContext && tenantManageItems.length > 0 && (
              <>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(232,231,224,0.4)', padding: '18px 10px 8px' }}>
                  Manage
                </div>
                {tenantManageItems.map((item) => {
                  const active = isActive(item.href);
                  const href = withTenantParam(item.href, tenantParam);
                  return (
                    <Link
                      key={item.label}
                      href={href}
                      className="flex items-center gap-[10px] w-full text-left transition-[background,color]"
                      style={{
                        padding: '8px 10px', borderRadius: 5, fontSize: 13,
                        color: active ? '#f4f3ee' : 'rgba(232,231,224,0.72)',
                        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                        transitionDuration: '120ms',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f4f3ee'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; if (!active) e.currentTarget.style.color = 'rgba(232,231,224,0.72)'; }}
                    >
                      <span className="shrink-0" style={{ opacity: 0.85 }}>{item.icon}</span>
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                    </Link>
                  );
                })}
              </>
            )}

            {/* JOIN section (main platform only) */}
            {!isTenantContext && (
              <>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(232,231,224,0.4)', padding: '18px 10px 8px' }}>
                  Join
                </div>
                {JOIN_NAV.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-[10px] w-full text-left transition-[background,color]"
                      style={{
                        padding: '8px 10px', borderRadius: 5, fontSize: 13,
                        color: active ? '#f4f3ee' : 'rgba(232,231,224,0.72)',
                        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                        transitionDuration: '120ms',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f4f3ee'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; if (!active) e.currentTarget.style.color = 'rgba(232,231,224,0.72)'; }}
                    >
                      <span className="shrink-0" style={{ opacity: 0.85 }}>{item.icon}</span>
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                    </Link>
                  );
                })}
              </>
            )}

            {/* Admin Console link — subtle, for super admins only */}
            {isSuperAdminUser && !isTenantContext && (
              <Link
                href="/admin"
                className="flex items-center gap-[10px] w-full text-left"
                style={{
                  padding: '8px 10px', borderRadius: 5, fontSize: 12,
                  color: 'rgba(232,231,224,0.45)', marginTop: 14,
                  textDecoration: 'none', transition: 'color 120ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f4f3ee'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(232,231,224,0.45)'; }}
              >
                <Shield size={13} style={{ opacity: 0.6 }} />
                {!collapsed && <span>Admin Console</span>}
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Wallet pill */}
      {!collapsed && (
        <div
          className="flex items-center justify-between mx-3 mb-1.5"
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            fontSize: 12,
          }}
        >
          <span className="flex items-center gap-[7px]" style={{ color: 'rgba(232,231,224,0.6)' }}>
            <Wallet size={13} />
            Wallet
          </span>
          <span style={{ color: 'var(--accent)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            $100
          </span>
        </div>
      )}

      {/* Bottom: Settings + Tenant powered-by */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Settings link */}
        {(isTenantAdmin || !isTenantContext) && (
          <Link
            href={withTenantParam(isTenantContext ? '/settings/tenant' : '/settings', tenantParam)}
            className="flex items-center gap-[10px] mx-3 mt-2 transition-[background,color]"
            style={{
              padding: '8px 10px', borderRadius: 5, fontSize: 13,
              color: isActive('/settings') ? '#f4f3ee' : 'rgba(232,231,224,0.72)',
              background: isActive('/settings') ? 'rgba(255,255,255,0.07)' : 'transparent',
              transitionDuration: '120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f4f3ee'; }}
            onMouseLeave={(e) => { if (!isActive('/settings')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(232,231,224,0.72)'; } }}
          >
            <Settings size={15} style={{ opacity: 0.85 }} />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}

        {/* Powered by Kunfa */}
        {isTenantContext && tenant?.show_powered_by && !collapsed && (
          <div style={{ fontSize: 10, color: 'rgba(232,231,224,0.35)', textAlign: 'center', padding: '8px 0' }}>
            Powered by <span style={{ fontWeight: 500, color: 'rgba(232,231,224,0.5)' }}>Kunfa</span>
          </div>
        )}

        {/* User block */}
        <div
          className="flex items-center gap-[10px]"
          style={{ padding: '14px 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.10 50))',
              color: 'var(--ink)', fontSize: 12, fontWeight: 500,
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0" style={{ lineHeight: 1.25 }}>
              <span className="truncate" style={{ fontSize: 13, color: '#f4f3ee' }}>
                {userName || userEmail || 'User'}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(232,231,224,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {roleLabel}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="ml-auto shrink-0 transition-colors"
              style={{ color: 'rgba(232,231,224,0.4)', padding: 4, borderRadius: 4 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f4f3ee'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(232,231,224,0.4)'; e.currentTarget.style.background = 'transparent'; }}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
