'use client';

import { PipelineStage } from '@/lib/types';

interface PipelineCount {
  stage: PipelineStage;
  count: number;
}

interface PipelineSummaryProps {
  counts: PipelineCount[];
  isLoading?: boolean;
}

const stageConfig: Record<PipelineStage, { label: string; color: string; bgColor: string }> = {
  sourcing: { label: 'Sourcing', color: 'bg-blue-500', bgColor: 'bg-blue-100' },
  screening: { label: 'Screening', color: 'bg-purple-500', bgColor: 'bg-purple-100' },
  diligence: { label: 'Diligence', color: 'bg-orange-500', bgColor: 'bg-orange-100' },
  close: { label: 'Close', color: 'bg-green-500', bgColor: 'bg-green-100' },
};

export function PipelineSummary({ counts, isLoading = false }: PipelineSummaryProps) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-6 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No deals in pipeline yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {counts.map((item) => {
        const config = stageConfig[item.stage];
        const percentage = (item.count / total) * 100;

        return (
          <div key={item.stage}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{config.label}</span>
              <span className="text-sm font-semibold text-gray-900">{item.count}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${config.color} transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-2 border-t border-gray-100 mt-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{total}</span> deals in pipeline
        </p>
      </div>
    </div>
  );
}
