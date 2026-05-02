'use client';

import { PageHead, ReferralBanner, Card, Button, Callout, SectionHead, EmptyState } from '@/components/ui/design-system';
import { Lock, Users, Check, Info, Mail } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';

export default function InvitationsPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{ padding: '0 20px' }}>
        {/* Referral banner */}
        <div style={{
          background: 'var(--ink)', color: '#f4f3ee', borderRadius: 18,
          padding: 22, position: 'relative', overflow: 'hidden',
          marginTop: 4, marginBottom: 16,
        }}>
          <div style={{
            position: 'absolute', right: -60, bottom: -100, width: 220, height: 220,
            borderRadius: '50%', background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
            opacity: 0.2, pointerEvents: 'none',
          }} />
          <h2 style={{ color: '#f4f3ee', fontSize: 22, lineHeight: 1.15, marginBottom: 6, position: 'relative', zIndex: 1 }}>
            Earn $50 for every investor you refer
          </h2>
          <p style={{ fontSize: 12.5, color: 'rgba(244,243,238,0.7)', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            Plus a $100 sourcing credit when they fund their first deal.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, position: 'relative', zIndex: 1 }}>
            {[{ v: '0', l: 'Pending' }, { v: '0', l: 'Joined' }, { v: '$0', l: 'Earned', a: true }].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: s.a ? 'var(--accent)' : '#f4f3ee' }}>{s.v}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,243,238,0.55)', marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite cards */}
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--bg-sunk)', borderRadius: 8, display: 'grid', placeItems: 'center' }}><Lock size={14} /></div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 16, margin: 0 }}>Invite a Startup</h3>
          </div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
            Send a founder a private invite to apply for Kunfa onboarding.
          </div>
          <button style={{ width: '100%', background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--ink)', padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Invite a Startup
          </button>
        </div>

        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--bg-sunk)', borderRadius: 8, display: 'grid', placeItems: 'center' }}><Users size={14} /></div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 16, margin: 0 }}>Refer an Investor</h3>
            <span style={{ marginLeft: 'auto', background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 500 }}>$50</span>
          </div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
            Refer an accredited investor. Both earn when they fund their first deal.
          </div>
          <button style={{ width: '100%', background: 'var(--accent)', color: 'var(--ink)', padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Refer an Investor
          </button>
        </div>

        {/* Callout */}
        <div style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: 12, padding: '12px 14px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5, marginBottom: 16 }}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Kunfa is member-referral only. Quality over quantity, always.</span>
        </div>

        {/* History */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 0 12px' }}>
          <h3 style={{ fontSize: 18, fontFamily: 'var(--serif)', fontWeight: 400, margin: 0 }}>Invitation history</h3>
        </div>
        <div style={{ background: 'var(--bg-elev)', border: '1px dashed var(--line-strong)', borderRadius: 14, padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto 12px', borderRadius: '50%', background: 'var(--bg-sunk)', color: 'var(--ink-faint)', display: 'grid', placeItems: 'center' }}>
            <Mail size={16} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No invitations yet</div>
          <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>Use the cards above to send your first.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Invitations"
        subtitle="Grow the Kunfa network. Membership is invite-only �� every member earns the right to refer."
      />

      <ReferralBanner
        stats={[
          { label: 'Pending', value: '0' },
          { label: 'Joined', value: '0' },
          { label: 'Earned', value: '$0', accent: true },
        ]}
      />

      {/* Invite cards */}
      <div className="invite-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Invite a Startup */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--bg-sunk)', borderRadius: 8,
              display: 'grid', placeItems: 'center',
            }}>
              <Lock size={16} style={{ color: 'var(--ink-soft)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>Invite a Startup</h3>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>
            Send a founder a private invite to apply for Kunfa onboarding. They&apos;ll skip the public waitlist.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              Bypasses waitlist for invited founder
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              Tracked attribution back to you
            </div>
          </div>
          <Button variant="ghost" style={{ width: '100%', justifyContent: 'center' }}>Invite a Startup</Button>
        </Card>

        {/* Refer an Investor */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--bg-sunk)', borderRadius: 8,
              display: 'grid', placeItems: 'center',
            }}>
              <Users size={16} style={{ color: 'var(--ink-soft)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>
              Refer an Investor{' '}
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                borderRadius: 99, fontSize: 11, fontWeight: 500, marginLeft: 6,
                background: 'var(--accent-soft)', color: 'var(--accent-ink)',
              }}>
                $50 per referral
              </span>
            </h3>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>
            Refer an accredited investor. They review-up — when they fund their first deal, you both earn.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              $50 credit to you on signup
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              +$100 to you on first funded deal
            </div>
          </div>
          <Button variant="accent" style={{ width: '100%', justifyContent: 'center' }}>Refer an Investor</Button>
        </Card>
      </div>

      <Callout icon={<Info size={14} />}>
        Kunfa is member-referral only. Every startup on the platform was nominated by a verified investor or operator. Quality over quantity, always.
      </Callout>

      <SectionHead title="Invitation history" />

      <EmptyState
        dashed
        icon={<Mail size={18} />}
        title="No invitations yet"
        description="Use the cards above to send your first one."
      />
    </div>
  );
}
