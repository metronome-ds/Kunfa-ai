'use client';

import { DDChecklist } from '@/components/calculators/DDChecklist';

export default function DDChecklistPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-[family-name:var(--serif)] tabular-nums tracking-tight text-[var(--ink)]">Due Diligence Checklist</h1>
        <p className="text-[var(--ink-soft)] mt-2">
          Track your team's progress on comprehensive due diligence across all key areas
        </p>
      </div>

      {/* Checklist */}
      <DDChecklist />
    </div>
  );
}
