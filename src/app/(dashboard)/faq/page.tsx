'use client';

import { useState } from 'react';
import { PageHead, Accordion, Button } from '@/components/ui/design-system';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';

const FAQS = [
  { question: "What is Kunfa?", answer: "Kunfa is an AI-powered venture intelligence platform. We help accredited investors source, score, and manage early-stage deals — and help founders get investment-ready and matched with the right capital." },
  { question: "Who can join as an investor?", answer: "Membership is invite-only and limited to accredited investors, qualified purchasers, family offices, and institutional investors. You'll need an invitation code from an existing member or partner." },
  { question: "What is the minimum investment per deal?", answer: "Minimums are set by each deal but typically range from $5,000 to $25,000. Some allocations may have higher floors based on the stage and round structure." },
  { question: "How are startups vetted?", answer: "Every startup is nominated by a verified member, then scored by Kunfa's intelligence layer across team, traction, market, and financials. Only the top-scoring companies are invited to raise." },
  { question: "What sectors do you focus on?", answer: "We are sector-agnostic but see strong activity in fintech, climate, AI/ML, biotech, and consumer. Our matching engine routes deals based on your declared thesis." },
  { question: "Can I sell my investment?", answer: "Yes. Kunfa runs a secondary marketplace where members can list and bid on existing positions, subject to issuer transfer rules." },
  { question: "How does the secondary marketplace work?", answer: "Members list portions of their existing positions; matched buyers can bid; cleared trades route through our broker partner. Settlement typically takes 5–10 business days." },
  { question: "How do I refer a startup?", answer: "Visit the Invitations page and use the 'Invite a Startup' card. Your nomination is tracked and you'll be credited as the referring member if they're admitted." },
  { question: "What fees do you charge?", answer: "Kunfa charges a 1% platform fee per primary deal and a 1.5% spread on secondary trades. There are no annual membership fees for individual accredited investors." },
  { question: "Are investments guaranteed?", answer: "No. All investments carry risk of partial or total loss. Kunfa provides intelligence, not investment advice. Read each deal's disclosure carefully." },
];

export default function FAQPage() {
  const isMobile = useIsMobile();
  const [openIdx, setOpenIdx] = useState(0);

  if (isMobile) {
    return (
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 16px' }}>
          Everything you need to know about Kunfa, our membership model, and how the platform works.
        </p>

        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginTop: 4 }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                style={{
                  width: '100%', padding: '16px 18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', textAlign: 'left', fontSize: 13.5, fontWeight: 500,
                  gap: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)',
                }}
              >
                <span>{f.question}</span>
                <ChevronDown size={14} style={{
                  color: openIdx === i ? 'var(--ink)' : 'var(--ink-mute)',
                  transition: 'transform 200ms', flexShrink: 0,
                  transform: openIdx === i ? 'rotate(180deg)' : undefined,
                }} />
              </button>
              {openIdx === i && (
                <div style={{ padding: '0 18px 16px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                  {f.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--ink)', color: '#f4f3ee', borderRadius: 14,
          padding: '18px 20px', marginTop: 14, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: -60, top: '50%', transform: 'translateY(-50%)',
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
            opacity: 0.18, pointerEvents: 'none',
          }} />
          <h3 style={{ color: '#f4f3ee', fontSize: 17, marginBottom: 4, position: 'relative', zIndex: 1 }}>Still have questions?</h3>
          <p style={{ color: 'rgba(244,243,238,0.65)', fontSize: 12.5, marginBottom: 12, position: 'relative', zIndex: 1 }}>
            Drop us a line and our team will get back within 24 hours.
          </p>
          <button style={{
            background: '#fff', color: 'var(--ink)', padding: '10px 16px',
            borderRadius: 99, fontSize: 12.5, fontWeight: 600,
            position: 'relative', zIndex: 1, border: 'none', cursor: 'pointer',
          }}>
            Contact us
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="FAQ"
        subtitle="Everything you need to know about Kunfa, our membership model, and how the platform works."
      />

      <Accordion items={FAQS} />

      {/* Still have questions? CTA */}
      <div style={{
        marginTop: 28, background: 'var(--ink)', color: '#f4f3ee',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: -80, top: '50%', transform: 'translateY(-50%)',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          opacity: 0.15, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ color: '#f4f3ee', fontSize: 19, marginBottom: 4 }}>Still have questions?</h3>
          <p style={{ color: 'rgba(244,243,238,0.65)', fontSize: 13 }}>
            Drop us a line and our team will get back to you within 24 hours.
          </p>
        </div>
        <Button variant="on-dark" style={{ position: 'relative', zIndex: 1 }}>Contact us</Button>
      </div>
    </div>
  );
}
