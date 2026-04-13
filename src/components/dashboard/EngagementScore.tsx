'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Activity, Eye, Bookmark, Users, FileUp, Share2 } from 'lucide-react';

interface EngagementMetrics {
  deals_viewed: number;
  deals_saved: number;
  connections_made: number;
  deals_posted: number;
  documents_uploaded: number;
  score: number;
  breakdown: Record<
    string,
    { count: number; weight: number }
  >;
}

export function EngagementScore() {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEngagementScore = async () => {
      try {
        const response = await fetch('/api/engagement');
        if (!response.ok) {
          throw new Error('Failed to fetch engagement score');
        }
        const { data } = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching engagement score:', err);
        setError('Failed to load engagement score');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagementScore();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded-full mx-auto w-20" />
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <div className="text-center py-4">
          <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{error || 'Unable to load engagement score'}</p>
        </div>
      </Card>
    );
  }

  const scorePercentage = (metrics.score / 1000) * 100;
  const scoreColor =
    metrics.score >= 750 ? 'text-green-600' :
    metrics.score >= 500 ? 'text-blue-600' :
    metrics.score >= 250 ? 'text-yellow-600' :
    'text-gray-600';

  const scoreRingColor =
    metrics.score >= 750 ? 'stroke-green-600' :
    metrics.score >= 500 ? 'stroke-blue-600' :
    metrics.score >= 250 ? 'stroke-yellow-600' :
    'stroke-gray-600';

  const engagementItems = [
    {
      icon: Eye,
      label: 'Deals Viewed',
      count: metrics.deals_viewed,
      weight: 10,
    },
    {
      icon: Bookmark,
      label: 'Deals Saved',
      count: metrics.deals_saved,
      weight: 20,
    },
    {
      icon: Users,
      label: 'Connections Made',
      count: metrics.connections_made,
      weight: 30,
    },
    {
      icon: Share2,
      label: 'Deals Posted',
      count: metrics.deals_posted,
      weight: 50,
    },
    {
      icon: FileUp,
      label: 'Documents Uploaded',
      count: metrics.documents_uploaded,
      weight: 25,
    },
  ];

  return (
    <Card title="Engagement Score" subtitle="Track your platform activity">
      <div className="space-y-6">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-32 h-32 mb-4">
            {/* SVG Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                className={scoreRingColor}
                strokeWidth="8"
                strokeDasharray={`${(scorePercentage / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-3xl font-bold ${scoreColor}`}>
                {Math.round(metrics.score)}
              </div>
              <div className="text-xs text-gray-500">out of 1000</div>
            </div>
          </div>

          {/* Score Label */}
          <p className="text-sm font-medium text-gray-600">
            {metrics.score >= 750 ? 'Highly Active' :
             metrics.score >= 500 ? 'Active' :
             metrics.score >= 250 ? 'Moderate' :
             'Just Starting'}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {engagementItems.map((item) => {
            const Icon = item.icon;
            const contribution = item.count * item.weight;
            const percentOfTotal = metrics.score > 0 ? (contribution / metrics.score) * 100 : 0;

            return (
              <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-500">
                    {Math.round(percentOfTotal)}%
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-900">{item.count}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
                {/* Mini progress bar */}
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#007CF8] rounded-full transition-all"
                    style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Boost Your Score</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• View and analyze deals in the marketplace</li>
            <li>• Save deals to your watchlist</li>
            <li>• Upload and organize deal documents</li>
            <li>• Connect with founders and investors</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
