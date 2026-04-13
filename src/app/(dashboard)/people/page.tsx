'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Briefcase,
  MapPin,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

interface Person {
  id: string;
  user_id: string;
  full_name: string;
  headline: string | null;
  company: string | null;
  location: string | null;
  avatar_url: string | null;
  role: string;
  interests: string[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_FILTERS = [
  { value: 'all', label: 'All People' },
  { value: 'founder', label: 'Founders' },
  { value: 'investor', label: 'Investors' },
  { value: 'service_provider', label: 'Service Providers' },
];

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchPeople();
  }, [selectedRole, currentPage]);

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(selectedRole !== 'all' && { role: selectedRole }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/people?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }

      const { data, pagination: paginationData } = await response.json();
      setPeople(data || []);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching people:', error);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'founder':
        return 'bg-purple-100 text-purple-800';
      case 'investor':
        return 'bg-green-100 text-green-800';
      case 'service_provider':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          People Directory
        </h1>
        <p className="text-gray-600 mt-2">
          Connect with founders, investors, and service providers
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, company, or headline..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setSelectedRole(filter.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRole === filter.value
                    ? 'bg-[#007CF8] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* People Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Loading people...</p>
          </div>
        </div>
      ) : people.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No people found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters to find who you're looking for.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {people.map((person) => (
              <div
                key={person.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewProfile(person.user_id)}
              >
              <Card
                className="flex flex-col h-full"
              >
                {/* Header with Avatar */}
                <div className="pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.full_name}
                        className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {person.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {person.full_name}
                      </h3>
                      {person.headline && (
                        <p className="text-sm text-gray-600 truncate">
                          {person.headline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="py-4 space-y-2 flex-1">
                  {/* Company */}
                  {person.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{person.company}</span>
                    </div>
                  )}

                  {/* Location */}
                  {person.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{person.location}</span>
                    </div>
                  )}

                  {/* Role Badge */}
                  <div className="pt-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(person.role)}`}>
                      <UserCheck className="h-3 w-3" />
                      {person.role.charAt(0).toUpperCase() + person.role.slice(1).replace('_', ' ')}
                    </span>
                  </div>

                  {/* Interests */}
                  {person.interests && person.interests.length > 0 && (
                    <div className="pt-3">
                      <div className="flex flex-wrap gap-1">
                        {person.interests.slice(0, 4).map((interest, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Profile Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(person.user_id);
                  }}
                >
                  View Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum <= pagination.totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#007CF8] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}

              {pagination.totalPages > 5 && (
                <>
                  {currentPage <= pagination.totalPages - 3 && (
                    <span className="text-gray-700">...</span>
                  )}
                  {currentPage < pagination.totalPages - 2 && (
                    <button
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      className="px-3 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      {pagination.totalPages}
                    </button>
                  )}
                </>
              )}

              <Button
                variant="secondary"
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
