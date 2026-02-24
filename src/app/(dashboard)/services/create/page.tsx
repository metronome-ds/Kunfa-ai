'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface ServiceForm {
  title: string;
  description: string;
  service_type: string;
  hourly_rate: string;
  expertise_areas: string[];
  certifications: string[];
}

export default function CreateServicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newExpertise, setNewExpertise] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [form, setForm] = useState<ServiceForm>({
    title: '',
    description: '',
    service_type: 'consulting',
    hourly_rate: '',
    expertise_areas: [],
    certifications: [],
  });

  const SERVICE_TYPES = [
    { value: 'legal', label: 'Legal Services' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'consulting', label: 'Consulting' },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !form.expertise_areas.includes(newExpertise.trim())) {
      setForm((prev) => ({
        ...prev,
        expertise_areas: [...prev.expertise_areas, newExpertise.trim()],
      }));
      setNewExpertise('');
    }
  };

  const removeExpertise = (index: number) => {
    setForm((prev) => ({
      ...prev,
      expertise_areas: prev.expertise_areas.filter((_, i) => i !== index),
    }));
  };

  const addCertification = () => {
    if (newCertification.trim() && !form.certifications.includes(newCertification.trim())) {
      setForm((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (
        !form.title.trim() ||
        !form.description.trim() ||
        !form.hourly_rate ||
        form.expertise_areas.length === 0
      ) {
        setError('Please fill in all required fields and add at least one expertise area');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          service_type: form.service_type,
          hourly_rate: parseFloat(form.hourly_rate),
          expertise_areas: form.expertise_areas,
          certifications: form.certifications,
        }),
      });

      if (!response.ok) {
        const { error: errorMsg } = await response.json();
        throw new Error(errorMsg || 'Failed to create service listing');
      }

      router.push('/services');
    } catch (err) {
      console.error('Error creating service:', err);
      setError(err instanceof Error ? err.message : 'Failed to create service listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Services
        </button>
        <h1 className="text-3xl font-bold text-gray-900">List Your Service</h1>
        <p className="text-gray-600 mt-2">
          Create a new service listing to showcase your expertise
        </p>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Service Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Title *
            </label>
            <Input
              type="text"
              name="title"
              placeholder="e.g., Startup Legal Consultation"
              value={form.title}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Description *
            </label>
            <textarea
              name="description"
              placeholder="Describe your service, what you offer, and your approach..."
              value={form.description}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type *
            </label>
            <select
              name="service_type"
              value={form.service_type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate ($) *
            </label>
            <Input
              type="number"
              name="hourly_rate"
              placeholder="150"
              value={form.hourly_rate}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Expertise Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas of Expertise * (Add at least 1)
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                placeholder="e.g., Contract Drafting"
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExpertise();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addExpertise}
                className="flex-shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {form.expertise_areas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.expertise_areas.map((area, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => removeExpertise(index)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certifications (Optional)
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                placeholder="e.g., MBA, CPA, CISSP"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCertification();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCertification}
                className="flex-shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {form.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="hover:text-green-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Service Listing
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
