import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function Card({
  children,
  title,
  subtitle,
  action,
  className,
}: CardProps) {
  return (
    <div
      className={`bg-[var(--bg-elev)] rounded-xl border border-[var(--line)] overflow-hidden ${
        className || ''
      }`}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-start justify-between">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--ink-soft)] mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
