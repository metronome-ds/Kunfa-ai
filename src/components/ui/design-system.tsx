'use client';

import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ArrowRight, X, type LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type BtnVariant = 'primary' | 'accent' | 'ghost' | 'light' | 'on-dark';

const BTN_STYLES: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: 'var(--ink)', color: '#fafaf7' },
  accent: { background: 'var(--accent)', color: 'var(--ink)' },
  ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-strong)' },
  light: { background: '#fff', color: 'var(--ink)', border: '1px solid var(--line-strong)' },
  'on-dark': { background: '#fff', color: 'var(--ink)' },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  icon?: ReactNode;
  iconRight?: ReactNode;
  href?: string;
}

export function Button({ variant = 'primary', icon, iconRight, children, className, href, style, ...props }: ButtonProps) {
  const s: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
    letterSpacing: '-0.005em', transition: 'opacity 120ms', cursor: 'pointer',
    border: 'none', ...BTN_STYLES[variant], ...style,
  };
  if (href) {
    return <Link href={href} style={s} className={className}>{icon}{children}{iconRight}</Link>;
  }
  return <button style={s} className={className} {...props}>{icon}{children}{iconRight}</button>;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

type CardVariant = 'default' | 'dark' | 'accent-soft';

export function Card({ variant = 'default', children, className, style, ...props }: { variant?: CardVariant; children: ReactNode; className?: string; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>) {
  const base: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)', padding: 22, border: '1px solid var(--line)',
    background: variant === 'dark' ? 'var(--ink)' : variant === 'accent-soft' ? 'var(--accent-soft)' : 'var(--bg-elev)',
    color: variant === 'dark' ? '#f4f3ee' : 'var(--ink)',
    ...style,
  };
  if (variant === 'dark') base.border = 'none';
  return <div style={base} className={className} {...props}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

type TagVariant = 'default' | 'accent' | 'ink';

export function Tag({ variant = 'default', children, style }: { variant?: TagVariant; children: ReactNode; style?: React.CSSProperties }) {
  const styles: Record<TagVariant, React.CSSProperties> = {
    default: { background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line-strong)' },
    accent: { background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid transparent' },
    ink: { background: 'var(--ink)', color: '#f4f3ee', border: '1px solid transparent' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 99, fontSize: 11, fontWeight: 500, ...styles[variant], ...style,
    }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

interface FieldProps { label: string; required?: boolean; help?: string; full?: boolean; children: ReactNode }

export function Field({ label, required, help, full, children }: FieldProps) {
  return (
    <div className={full ? 'full' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
        {label} {required && <span style={{ color: 'var(--negative)' }}>*</span>}
      </label>
      {children}
      {help && <span style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>{help}</span>}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 5,
  padding: '10px 12px', fontSize: 13.5, width: '100%', outline: 'none',
  transition: 'border-color 120ms, box-shadow 120ms', color: 'var(--ink)',
  fontFamily: 'inherit',
};

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...INPUT_STYLE, ...props.style }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = 'var(--focus-ring)'; props.onFocus?.(e); }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.boxShadow = 'none'; props.onBlur?.(e); }}
  />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 96, fontFamily: 'inherit', ...props.style }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = 'var(--focus-ring)'; props.onFocus?.(e); }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.boxShadow = 'none'; props.onBlur?.(e); }}
  />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...INPUT_STYLE, ...props.style }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = 'var(--focus-ring)'; props.onFocus?.(e); }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.boxShadow = 'none'; props.onBlur?.(e); }}
  />;
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

export function StatCard({ label, value, foot, icon }: { label: string; value: string; foot?: string; icon?: ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)' }}>
        <span>{label}</span>
        {icon && <span style={{ opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {foot && <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{foot}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHead
// ---------------------------------------------------------------------------

export function PageHead({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: subtitle ? 8 : 0 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--ink-soft)', fontSize: 14, maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {cta}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHead
// ---------------------------------------------------------------------------

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '40px 0 18px' }}>
      <h2 style={{ fontSize: 22 }}>{title}</h2>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: ReactNode }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', margin: '0 0 28px' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '12px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7,
            color: active === t.id ? 'var(--ink)' : 'var(--ink-mute)',
            borderBottom: `2px solid ${active === t.id ? 'var(--ink)' : 'transparent'}`,
            marginBottom: -1, background: 'none', border: 'none', cursor: 'pointer',
            borderBottomStyle: 'solid', borderBottomWidth: 2,
            borderBottomColor: active === t.id ? 'var(--ink)' : 'transparent',
            transition: 'color 120ms',
          }}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

type StepState = 'done' | 'active' | 'default';

export function Stepper({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 28px', flexWrap: 'wrap', fontSize: 12 }}>
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 7,
            color: s.state === 'active' ? 'var(--ink)' : s.state === 'done' ? 'var(--ink-soft)' : 'var(--ink-mute)',
            fontWeight: s.state === 'active' ? 500 : 400,
          }}>
            <span style={{
              width: 20, height: 20, display: 'grid', placeItems: 'center', borderRadius: '50%',
              fontSize: 11, fontVariantNumeric: 'tabular-nums',
              background: s.state === 'done' ? 'var(--ink)' : s.state === 'active' ? 'var(--accent)' : 'var(--bg-sunk)',
              color: s.state === 'done' ? '#fff' : s.state === 'active' ? 'var(--ink)' : 'var(--ink-mute)',
              border: s.state === 'done' ? '1px solid var(--ink)' : s.state === 'active' ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
            }}>
              {i + 1}
            </span>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <span style={{ color: 'var(--ink-faint)' }}><ChevronRight size={11} /></span>
          )}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({ icon, title, description, dashed }: { icon?: ReactNode; title: string; description?: string; dashed?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: `1px ${dashed ? 'dashed' : 'solid'} ${dashed ? 'var(--line-strong)' : 'var(--line)'}`,
      borderRadius: 'var(--radius-lg)', padding: '56px 32px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 44, height: 44, margin: '0 auto 16px', display: 'grid', placeItems: 'center',
          background: 'var(--bg-sunk)', borderRadius: '50%', color: 'var(--ink-faint)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, marginBottom: 4, color: 'var(--ink)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{description}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

export function Callout({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div style={{
      background: 'var(--accent-soft)', borderRadius: 6, padding: '12px 16px',
      fontSize: 12.5, color: 'var(--accent-ink)', display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      {icon && <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

export function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            style={{
              width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', textAlign: 'left', fontSize: 14, fontWeight: 500,
              color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sunk)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.question}</span>
            <ChevronDown
              size={16}
              style={{
                color: openIdx === i ? 'var(--ink)' : 'var(--ink-mute)',
                transition: 'transform 200ms',
                transform: openIdx === i ? 'rotate(180deg)' : undefined,
                flexShrink: 0,
              }}
            />
          </button>
          {openIdx === i && (
            <div style={{
              padding: '0 24px 20px', fontSize: 13.5, lineHeight: 1.65,
              color: 'var(--ink-soft)', maxWidth: 720,
            }}>
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WelcomeBanner
// ---------------------------------------------------------------------------

export function WelcomeBanner({ title, body, cta, onDismiss }: { title: string; body: string; cta?: ReactNode; onDismiss?: () => void }) {
  return (
    <div style={{
      background: 'var(--ink)', color: '#f4f3ee', borderRadius: 'var(--radius-lg)',
      padding: '26px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, marginBottom: 36, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        content: '""', position: 'absolute', right: -40, top: -40,
        width: 220, height: 220,
        background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
        opacity: 0.18, pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: 'rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center',
          color: 'var(--accent)', flexShrink: 0,
        }}>
          ✦
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19, letterSpacing: '-0.01em', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'rgba(244,243,238,0.7)', maxWidth: 540 }}>{body}</div>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 10 }}>{cta}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: 14, right: 14,
            color: 'rgba(244,243,238,0.5)', width: 22, height: 22,
            display: 'grid', placeItems: 'center', borderRadius: 4,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReferralBanner
// ---------------------------------------------------------------------------

export function ReferralBanner({ stats }: { stats: { label: string; value: string; accent?: boolean }[] }) {
  return (
    <div style={{
      background: 'var(--ink)', color: '#f4f3ee', borderRadius: 'var(--radius-lg)',
      padding: '32px 36px', marginBottom: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -60, bottom: -120,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
        opacity: 0.2, pointerEvents: 'none',
      }} />
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 99,
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--accent)', marginBottom: 14,
      }}>
        ✦ Limited time · Ends 30 June 2026
      </div>
      <h2 style={{ color: '#f4f3ee', fontSize: 30, marginBottom: 8 }}>Earn $50 for every investor you refer</h2>
      <p style={{ color: 'rgba(244,243,238,0.7)', fontSize: 14, marginBottom: 22, maxWidth: 480 }}>
        Plus a $100 sourcing credit when your referral funds their first deal — stackable with your member benefits.
      </p>
      <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '14px 18px', minWidth: 96,
          }}>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1,
              color: s.accent ? 'var(--accent)' : '#f4f3ee',
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'rgba(244,243,238,0.55)', marginTop: 6,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkText (subtle underline link matching design)
// ---------------------------------------------------------------------------

export function LinkText({ href, children, icon }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color: 'var(--ink-soft)', fontSize: 12, textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        borderBottom: '1px solid var(--line-strong)', paddingBottom: 1,
      }}
    >
      {children} {icon}
    </Link>
  );
}
