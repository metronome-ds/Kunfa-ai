'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Deal, DealStatus } from '@/lib/types';
import {
  Plus,
  Edit2,
  Archive,
  Eye,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';

interface DealWithStats extends Deal {
  views?: number;
  saves?: number;
}

export default function MyDealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all');
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyDeals = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/deals/my-deals');

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch deals');
        }

        const data = await response.json();
        setDeals(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyDeals();
  }, [router]);

  const handleArchive = async (dealId: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, status: 'archived' as DealStatus } : d
          )
        );
        setExpandedMenu(null);
      }
    } catch (err) {
      console.error('Error archiving deal:', err);
      alert('Failed to archive deal');
    }
  };

  const filteredDeals =
    statusFilter === 'all'
      ? deals
      : deals.filter((d) => d.status === statusFilter);

  const getDealStatusColor = (status: DealStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-blue-100 text-blue-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'archived':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDealStatusLabel = (status: DealStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Deals</h1>
            <p className="text-gray-600">
              Manage the deals you've listed on Kunfa AI
            </p>
          </div>
          <Button
            onClick={() => router.push('/deals/create')}
            icon={<Plus className="h-5 w-5" />}
            variant="primary"
            size="lg"
          >
            List New Deal
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8">
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2">
          {(['all', 'active', 'closed', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All Deals' : getDealStatusLabel(status as DealStatus)}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error loading deals</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your deals...</p>
            </div>
          </div>
        ) : filteredDeals.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-gray-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'all'
                ? 'No deals listed yet'
                : `No ${statusFilter} deals`}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'all'
                ? 'Get started by listing your first deal'
                : 'No deals match this status filter'}
            </p>
            {statusFilter === 'all' && (
              <Button
                onClick={() => router.push('/deals/create')}
                icon={<Plus className="h-5 w-5" />}
                variant="primary"
              >
                List Your First Deal
              </Button>
            )}
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Stage
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    AI Score
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    <Eye className="h-5 w-5 inline-block" /> Views
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    <BookmarkCheck className="h-5 w-5 inline-block" /> Saves
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {/* Company */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {deal.company_name}
                      </Link>
                      <p className="text-sm text-gray-500">{deal.industry}</p>
                    </td>

                    {/* Stage */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {deal.stage
                          .split('-')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getDealStatusColor(
                          deal.status as any
                        )}`}
                      >
                        {getDealStatusLabel(deal.status as any)}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-6 py-4 text-center">
                      {deal.ai_score_overall !== null ? (
                        <span className="font-semibold text-gray-900">
                          {deal.ai_score_overall}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Pending</span>
                      )}
                    </td>

                    {/* Views */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">
                        {deal.views || 0}
                      </span>
                    </td>

                    {/* Saves */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">
                        {deal.saves || 0}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(deal.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center relative">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setExpandedMenu(
                              expandedMenu === deal.id ? null : deal.id
                            )
                          }
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>

                        {/* Dropdown Menu */}
                        {expandedMenu === deal.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <Link
                              href={`/deals/${deal.id}`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors border-b border-gray-100"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>

                            <Link
                              href={`/deals/${deal.id}/edit`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors border-b border-gray-100"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </Link>

                            <button
                              onClick={() => handleArchive(deal.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-red-600 transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
