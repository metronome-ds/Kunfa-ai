'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  DollarSign,
  Tag,
  MessageCircle,
} from 'lucide-react';

interface ServiceProvider {
  id: string;
  title: string;
  description: string;
  service_type: string;
  hourly_rate: number;
  expertise_areas: string[];
  created_at: string;
  users: {
    id: string;
    full_name: string;
    headline: string | null;
    avatar_url: string | null;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SERVICE_TYPES = [
  { value: '', label: 'All Services' },
  { value: 'legal', label: 'Legal' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'hr', label: 'HR' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'consulting', label: 'Consulting' },
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isServiceProvider, setIsServiceProvider] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    checkServiceProvider();
    fetchServices();
  }, [selectedType, currentPage]);

  const checkServiceProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setIsServiceProvider(profile?.role === 'service_provider' || false);
      }
    } catch (error) {
      console.error('Error checking service provider status:', error);
    }
  };

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(selectedType && { type: selectedType }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/services?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const { data, pagination: paginationData } = await response.json();
      setServices(data || []);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleContact = (providerId: string) => {
    router.push(`/profile/${providerId}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Services Marketplace
          </h1>
          <p className="text-gray-600 mt-2">
            Find expert service providers for your business needs
          </p>
        </div>
        {isServiceProvider && (
          <Button onClick={() => router.push('/services/create')}>
            <Plus className="h-5 w-5" />
            List Your Service
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by provider name or service title..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Service Type Filter */}
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setSelectedType(type.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === type.value
                    ? 'bg-[#007CF8] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Loading services...</p>
          </div>
        </div>
      ) : services.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No services found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters to find what you need.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col hover:shadow-lg transition-shadow">
                {/* Provider Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  {service.users.avatar_url ? (
                    <img
                      src={service.users.avatar_url}
                      alt={service.users.full_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {service.users.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {service.users.full_name}
                    </h3>
                    {service.users.headline && (
                      <p className="text-xs text-gray-600 truncate">
                        {service.users.headline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Service Info */}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h4>

                  {/* Service Type Badge */}
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                      {service.service_type}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                  </p>

                  {/* Expertise Areas */}
                  {service.expertise_areas && service.expertise_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {service.expertise_areas.slice(0, 3).map((area, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          <Tag className="h-3 w-3" />
                          {area}
                        </span>
                      ))}
                      {service.expertise_areas.length > 3 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          +{service.expertise_areas.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rate */}
                  <div className="flex items-center gap-1 mb-4 text-lg font-semibold text-blue-600">
                    <DollarSign className="h-5 w-5" />
                    {service.hourly_rate}/hr
                  </div>
                </div>

                {/* Contact Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleContact(service.users.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact
                </Button>
              </Card>
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

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#007CF8] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}

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
