'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import {
  TrendingUp,
  DollarSign,
  Target,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

interface PortfolioHolding {
  id: string;
  deal_id: string;
  deals?: any;
  investment_amount: number;
  equity_percentage: number;
  entry_valuation: number;
  current_valuation?: number;
  status: 'active' | 'exited' | 'written_off';
  invested_at: string;
  exit_type?: string;
  exit_date?: string;
  exit_amount?: number;
}

interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalMultiple: number;
  holdingsCount: number;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    currentValue: 0,
    totalMultiple: 0,
    holdingsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableDeals, setAvailableDeals] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    investmentAmount: '',
    investmentDate: new Date().toISOString().split('T')[0],
    equityPercent: '',
  });

  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }
      const { data, summary } = await response.json();
      setHoldings(data || []);
      setSummary(summary || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSearchDeals = async (query: string) => {
    if (!query.trim()) {
      setAvailableDeals([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/deals?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const { data } = await response.json();
        setAvailableDeals(data || []);
      }
    } catch (err) {
      console.error('Error searching deals:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddInvestment = async () => {
    if (!selectedDeal || !formData.investmentAmount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: selectedDeal,
          investmentAmount: parseFloat(formData.investmentAmount),
          investmentDate: formData.investmentDate,
          equityPercent: formData.equityPercent ? parseFloat(formData.equityPercent) : 0,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setSelectedDeal(null);
        setSearchQuery('');
        setFormData({
          investmentAmount: '',
          investmentDate: new Date().toISOString().split('T')[0],
          equityPercent: '',
        });
        await fetchPortfolio();
      } else {
        setError('Failed to add investment');
      }
    } catch (err) {
      console.error('Error adding investment:', err);
      setError('Failed to add investment');
    }
  };

  const handleUpdateValuation = async () => {
    if (!editingHolding || !formData.investmentAmount) return;

    try {
      const response = await fetch(`/api/portfolio/${editingHolding.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_valuation: parseFloat(formData.investmentAmount),
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingHolding(null);
        setFormData({
          investmentAmount: '',
          investmentDate: new Date().toISOString().split('T')[0],
          equityPercent: '',
        });
        await fetchPortfolio();
      } else {
        setError('Failed to update valuation');
      }
    } catch (err) {
      console.error('Error updating valuation:', err);
      setError('Failed to update valuation');
    }
  };

  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm('Are you sure you want to remove this holding?')) return;

    try {
      const response = await fetch(`/api/portfolio/${holdingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHoldings(holdings.filter((h) => h.id !== holdingId));
      } else {
        setError('Failed to delete holding');
      }
    } catch (err) {
      console.error('Error deleting holding:', err);
      setError('Failed to delete holding');
    }
  };

  const openEditModal = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setFormData({
      investmentAmount: (holding.current_valuation || holding.entry_valuation).toString(),
      investmentDate: holding.invested_at.split('T')[0],
      equityPercent: holding.equity_percentage.toString(),
    });
    setShowEditModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
            <p className="text-gray-600 mt-2">Monitor your investments and track performance</p>
          </div>
          <Button
            onClick={() => {
              setShowAddModal(true);
              setSelectedDeal(null);
              setSearchQuery('');
              setFormData({
                investmentAmount: '',
                investmentDate: new Date().toISOString().split('T')[0],
                equityPercent: '',
              });
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Investment
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.totalInvested)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.currentValue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Multiple</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {summary.totalMultiple.toFixed(2)}x
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Holdings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {summary.holdingsCount}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No investments yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first investment from the marketplace or your pipeline
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Investment
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Stage</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Investment</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Current Value</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Multiple</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const deal = holding.deals;
                  const currentValue = holding.current_valuation || holding.entry_valuation;
                  const multiple = holding.investment_amount > 0
                    ? currentValue / holding.investment_amount
                    : 0;
                  const gainLoss = currentValue - holding.investment_amount;
                  const gainLossPercent = holding.investment_amount > 0
                    ? (gainLoss / holding.investment_amount) * 100
                    : 0;

                  const statusColors = {
                    active: 'bg-green-100 text-green-700',
                    exited: 'bg-blue-100 text-blue-700',
                    written_off: 'bg-red-100 text-red-700',
                  };

                  return (
                    <tr key={holding.id} className="border-b border-gray-100 hover:bg-[#F8F9FB]">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">{deal?.company_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{deal?.industry}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{deal?.stage}</td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(holding.investment_amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(holding.invested_at)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(currentValue)}
                        </p>
                        <p className={`text-xs font-medium ${
                          gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-gray-900">{multiple.toFixed(2)}x</p>
                        <p className={`text-xs font-medium ${
                          gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColors[holding.status as keyof typeof statusColors]
                        }`}>
                          {holding.status.charAt(0).toUpperCase() + holding.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openEditModal(holding)}
                            className="p-2 hover:bg-gray-200 rounded transition-colors"
                            title="Edit valuation"
                          >
                            <Edit2 className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(holding.id)}
                            className="p-2 hover:bg-red-100 rounded transition-colors"
                            title="Delete holding"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Investment Modal */}
      <Modal
        isOpen={showAddModal}
        title="Add Investment"
        onClose={() => {
          setShowAddModal(false);
          setSelectedDeal(null);
          setSearchQuery('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for a deal
            </label>
            <Input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchDeals(e.target.value);
              }}
            />
          </div>

          {searchQuery && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">Searching...</div>
              ) : availableDeals.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No deals found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {availableDeals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal.id)}
                      className={`w-full text-left p-4 hover:bg-[#F8F9FB] ${
                        selectedDeal === deal.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900">{deal.company_name}</h4>
                      <p className="text-sm text-gray-600">{deal.industry}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Amount *
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.investmentAmount}
              onChange={(e) =>
                setFormData({ ...formData, investmentAmount: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Date
            </label>
            <Input
              type="date"
              value={formData.investmentDate}
              onChange={(e) =>
                setFormData({ ...formData, investmentDate: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equity %
            </label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.equityPercent}
              onChange={(e) =>
                setFormData({ ...formData, equityPercent: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <Button
              onClick={handleAddInvestment}
              disabled={!selectedDeal || !formData.investmentAmount}
            >
              Add Investment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Valuation Modal */}
      <Modal
        isOpen={showEditModal}
        title="Update Valuation"
        onClose={() => {
          setShowEditModal(false);
          setEditingHolding(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Valuation *
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={formData.investmentAmount}
              onChange={(e) =>
                setFormData({ ...formData, investmentAmount: e.target.value })
              }
            />
          </div>

          {editingHolding && (
            <div className="bg-[#F8F9FB] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">Original Investment</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(editingHolding.investment_amount)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatDate(editingHolding.invested_at)}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <Button
              onClick={handleUpdateValuation}
              disabled={!formData.investmentAmount}
            >
              Update Valuation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
