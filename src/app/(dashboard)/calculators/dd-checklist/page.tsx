'use client';

import { DDChecklist } from '@/components/calculators/DDChecklist';

export default function DDChecklistPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Due Diligence Checklist</h1>
        <p className="text-gray-600 mt-2">
          Track your team's progress on comprehensive due diligence across all key areas
        </p>
      </div>

      {/* Checklist */}
      <DDChecklist />
    </div>
  );
}
