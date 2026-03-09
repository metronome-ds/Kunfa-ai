'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { getScoreRange } from '@/lib/constants';
import {
  Bookmark,
  BookmarkCheck,
  Globe,
  AlertCircle,
  Loader2,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'overview' | 'analysis';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isRequestingMeeting, setIsRequestingMeeting] = useState(false);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/deals/${dealId}`);
        if (!response.ok) throw new Error('Failed to load deal');

        const data = await response.json();
        setDeal(data.data);

        // Check if deal is saved (watchlisted)
        const savedResponse = await fetch('/api/deals/saved');
        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          setIsSaved(savedData.data.some((d: any) => d.company_id === data.data?.company_id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      } finally {
        setIsLoading(false);
      }
    };

    if (dealId) {
      fetchDeal();
    }
  }, [dealId]);

  const handleSaveToggle = async () => {
    const companyId = deal?.company_id;
    if (!companyId) return;
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const handleRequestMeeting = async () => {
    try {
      setIsRequestingMeeting(true);
      const response = await fetch(`/api/deals/${dealId}/request-meeting`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Meeting request sent to deal creator!');
      }
    } catch (err) {
      console.error('Error requesting meeting:', err);
      alert('Failed to send meeting request');
    } finally {
      setIsRequestingMeeting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="max-w-md bg-white rounded-lg border border-red-200 p-6">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Error Loading Deal
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <Button onClick={() => router.back()} variant="primary" className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const company = deal.company_pages || {};
  const score = company.overall_score || deal.ai_score;
  const scoreRange = score ? getScoreRange(score) : null;
  const companyName = company.company_name || 'Unknown Company';
  const industry = company.industry || deal.sector || 'N/A';
  const raiseAmount = deal.raise_amount || company.raise_amount;
  const formattedFunding = raiseAmount
    ? raiseAmount >= 1_000_000
      ? `$${(raiseAmount / 1_000_000).toFixed(1)}M`
      : raiseAmount >= 1_000
        ? `$${(raiseAmount / 1_000).toFixed(0)}K`
        : `$${Number(raiseAmount).toLocaleString()}`
    : 'Not specified';
  const stageLabel = (company.stage || deal.stage || 'unknown')
    .split(/[-_]/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                  {industry}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                  {stageLabel}
                </span>
                {company.country && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                    {company.country}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {companyName}
              </h1>
              {company.description && (
                <p className="text-lg text-gray-600">{company.description}</p>
              )}

              {/* Links */}
              <div className="flex items-center gap-4 mt-4">
                {company.website_url && (
                  <a
                    href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                  </a>
                )}
                {company.slug && (
                  <Link
                    href={`/company/${company.slug}`}
                    className="flex items-center gap-2 text-[#0168FE] hover:text-[#0050CC]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Full Profile
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side - Score Circle & Action Buttons */}
            <div className="flex flex-col items-end gap-4">
              {score !== null && score !== undefined && (
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl ${
                    scoreRange?.bgColor || 'bg-gray-100'
                  }`}
                >
                  <span className={scoreRange?.textColor || 'text-gray-600'}>
                    {score}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button
                  onClick={handleSaveToggle}
                  variant={isSaved ? 'primary' : 'outline'}
                  className="w-full"
                  icon={
                    isSaved ? (
                      <BookmarkCheck className="h-5 w-5" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )
                  }
                >
                  {isSaved ? 'Watchlisted' : 'Add to Watchlist'}
                </Button>

                <Button
                  onClick={handleRequestMeeting}
                  isLoading={isRequestingMeeting}
                  variant="primary"
                  className="w-full"
                  icon={<MessageSquare className="h-5 w-5" />}
                >
                  Request Meeting
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center gap-8 px-8">
          {(['overview', 'analysis'] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Funding Requested</p>
                <p className="text-2xl font-bold text-gray-900">{formattedFunding}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {company.team_size || 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Founded</p>
                <p className="text-2xl font-bold text-gray-900">
                  {company.founded_year || 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Founder</p>
                <p className="text-lg font-bold text-gray-900">
                  {company.founder_name || 'N/A'}
                </p>
                {company.founder_title && (
                  <p className="text-sm text-gray-500">{company.founder_title}</p>
                )}
              </div>
            </div>

            {/* Problem & Solution */}
            {(company.problem_summary || company.solution_summary) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {company.problem_summary && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Problem</h3>
                    <p className="text-gray-700">{company.problem_summary}</p>
                  </div>
                )}
                {company.solution_summary && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Solution</h3>
                    <p className="text-gray-700">{company.solution_summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Business Model */}
            {company.business_model && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Business Model</h3>
                <p className="text-gray-700">{company.business_model}</p>
              </div>
            )}

            {/* Traction */}
            {company.traction && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Traction</h3>
                <p className="text-gray-700">{company.traction}</p>
              </div>
            )}

            {/* Use of Funds */}
            {company.use_of_funds && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Use of Funds</h3>
                <p className="text-gray-700">{company.use_of_funds}</p>
              </div>
            )}

            {/* Key Risks */}
            {company.key_risks && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Key Risks</h3>
                <p className="text-gray-700">{company.key_risks}</p>
              </div>
            )}

            {/* Notes */}
            {deal.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-700">{deal.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Detailed AI analysis coming soon</p>
          </div>
        )}
      </div>

      {/* Creator Info */}
      {deal.creator && (
        <div className="max-w-6xl mx-auto px-8 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Deal Creator</h3>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {deal.creator.full_name || 'Unknown'}
                </p>
                {deal.creator.job_title && (
                  <p className="text-sm text-gray-600">{deal.creator.job_title}</p>
                )}
                {deal.creator.company_name && (
                  <p className="text-sm text-gray-600">{deal.creator.company_name}</p>
                )}
              </div>

              {deal.creator.user_id && (
                <Link
                  href={`/profile/${deal.creator.user_id}`}
                  className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100"
                >
                  View Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
