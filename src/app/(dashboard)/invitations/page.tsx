'use client';

import { PageHead, ReferralBanner, Card, Button, Callout, SectionHead, EmptyState } from '@/components/ui/design-system';
import { Lock, Users, Check, Info, Mail } from 'lucide-react';

export default function InvitationsPage() {
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
