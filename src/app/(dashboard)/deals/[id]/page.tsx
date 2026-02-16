'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Deal, DealDocument } from '@/lib/types';
import { Button } from '@/components/common/Button';
import { SCORING_DIMENSIONS, getScoreRange } from '@/lib/constants';
import {
  Bookmark,
  BookmarkCheck,
  Globe,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Download,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface DealDetailData extends Deal {
  creator?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    company: string | null;
    headline: string | null;
    location: string | null;
  };
  deal_documents?: DealDocument[];
}

type TabType = 'overview' | 'documents' | 'analysis' | 'diligence';

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

        // Check if deal is saved
        const savedResponse = await fetch('/api/deals/saved');
        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          setIsSaved(savedData.data.some((d: any) => d.deal_id === dealId));
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
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/deals/${dealId}/save`, { method });
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

  const scoreRange = deal.ai_score_overall ? getScoreRange(deal.ai_score_overall) : null;
  const stageLabel = (deal.stage || 'unknown')
    .split('-')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const formattedFunding = deal.funding_amount
    ? `$${(deal.funding_amount / 1000000).toFixed(1)}M`
    : 'Not specified';

  const formattedValuation = deal.valuation
    ? `$${(deal.valuation / 1000000).toFixed(1)}M`
    : 'Not specified';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-8">
          <div className="flex-1">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                {deal.industry}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                {stageLabel}
              </span>
              {deal.ai_score_overall && (
                <span
                  className={`px-3 py-1 ${scoreRange?.bgColor} ${scoreRange?.textColor} text-sm font-semibold rounded-full`}
                >
                  Score: {deal.ai_score_overall}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {deal.company_name}
            </h1>
            <p className="text-lg text-gray-600">{deal.description}</p>

            {/* Links */}
            <div className="flex items-center gap-4 mt-4">
              {deal.website && (
                <a
                  href={deal.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Globe className="h-4 w-4" />
                  Visit Website
                </a>
              )}
            </div>
          </div>

          {/* Right Side - Score Circle & Action Buttons */}
          <div className="flex flex-col items-end gap-4">
            {deal.ai_score_overall !== null && (
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl ${
                  scoreRange?.bgColor || 'bg-gray-100'
                }`}
              >
                <span className={scoreRange?.textColor || 'text-gray-600'}>
                  {deal.ai_score_overall}
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
                {isSaved ? 'Saved' : 'Save Deal'}
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center gap-8 px-8">
          {(['overview', 'documents', 'analysis', 'diligence'] as const).map(
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
                <p className="text-sm text-gray-600 mb-2">Post-Money Valuation</p>
                <p className="text-2xl font-bold text-gray-900">{formattedValuation}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deal.team_size || 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">Deal Type</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {deal.deal_type || 'N/A'}
                </p>
              </div>
            </div>

            {/* AI Summary */}
            {deal.ai_score_metadata?.summary && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  AI Analysis Summary
                </h3>
                <p className="text-gray-700 leading-relaxed">{deal.ai_score_metadata?.summary}</p>
              </div>
            )}

            {/* Scoring Dimensions */}
            {deal.ai_score_overall && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                  Scoring Breakdown
                </h3>
                <div className="space-y-6">
                  {[
                    { label: 'Team', score: deal.ai_score_team },
                    { label: 'Market', score: deal.ai_score_market },
                    { label: 'Traction', score: deal.ai_score_traction },
                    { label: 'Product', score: deal.ai_score_product },
                    { label: 'Financials', score: deal.ai_score_financials },
                    { label: 'Competitive Landscape', score: deal.ai_score_competitive_landscape },
                  ].map((dim) => (
                    <div key={dim.label}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{dim.label}</p>
                        <p className="text-lg font-bold text-gray-900">{dim.score ?? '—'}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${dim.score || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Problem & Solution */}
            {(deal.problem_statement || deal.solution) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {deal.problem_statement && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Problem</h3>
                    <p className="text-gray-700">{deal.problem_statement}</p>
                  </div>
                )}
                {deal.solution && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Solution</h3>
                    <p className="text-gray-700">{deal.solution}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            {deal.deal_documents && deal.deal_documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {deal.deal_documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          doc.parse_status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : doc.parse_status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {doc.parse_status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1 truncate">
                      {doc.file_name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      {(doc.file_size / 1024).toFixed(0)} KB • Uploaded{' '}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    <a
                      href={doc.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No documents uploaded yet</p>
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

        {activeTab === 'diligence' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Due diligence tools coming soon</p>
          </div>
        )}
      </div>

      {/* Creator Info Sidebar */}
      {deal.creator && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Deal Creator</h3>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {deal.creator.avatar_url && (
                  <img
                    src={deal.creator.avatar_url}
                    alt={deal.creator.full_name}
                    className="h-16 w-16 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {deal.creator.full_name}
                  </p>
                  {deal.creator.headline && (
                    <p className="text-sm text-gray-600">{deal.creator.headline}</p>
                  )}
                  {deal.creator.company && (
                    <p className="text-sm text-gray-600">{deal.creator.company}</p>
                  )}
                  {deal.creator.location && (
                    <p className="text-sm text-gray-600">{deal.creator.location}</p>
                  )}
                </div>
              </div>

              <Link
                href={`/profile/${deal.creator.id}`}
                className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
