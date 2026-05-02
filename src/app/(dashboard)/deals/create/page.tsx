'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { DocumentUpload } from '@/components/deals/DocumentUpload';
import { INDUSTRIES, DEAL_STAGES } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Step = 'basic' | 'details' | 'narrative' | 'documents' | 'review';

interface FormData {
  company_name: string;
  company_description: string;
  industry: string;
  company_website: string;
  title: string;

  // Details
  funding_amount_requested: string;
  pre_money_valuation: string;
  post_money_valuation: string;
  equity_offered: string;
  stage: string;
  deal_type: string;
  founder_count: string;

  // Narrative
  problem_statement: string;
  solution: string;
  market_size: string;

  // Documents (file list)
  documents: File[];
}

const STEPS: Step[] = ['basic', 'details', 'narrative', 'documents', 'review'];

export default function CreateDealPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    company_description: '',
    industry: '',
    company_website: '',
    title: '',
    funding_amount_requested: '',
    pre_money_valuation: '',
    post_money_valuation: '',
    equity_offered: '',
    stage: 'seed',
    deal_type: 'equity',
    founder_count: '1',
    problem_statement: '',
    solution: '',
    market_size: '',
    documents: [],
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleInputChange = (
    field: keyof FormData,
    value: string | File[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const goToStep = (step: Step) => {
    setError(null);
    setCurrentStep(step);
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      goToStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      goToStep(STEPS[currentStepIndex + 1]);
    }
  };

  const validateStep = (step: Step): boolean => {
    setError(null);

    switch (step) {
      case 'basic':
        if (!formData.company_name.trim()) {
          setError('Company name is required');
          return false;
        }
        if (!formData.company_description.trim()) {
          setError('Company description is required');
          return false;
        }
        if (!formData.industry) {
          setError('Industry is required');
          return false;
        }
        return true;

      case 'details':
        if (!formData.stage) {
          setError('Deal stage is required');
          return false;
        }
        if (formData.funding_amount_requested && isNaN(Number(formData.funding_amount_requested))) {
          setError('Funding amount must be a valid number');
          return false;
        }
        return true;

      case 'narrative':
        // Narrative is optional but validate if provided
        if (formData.market_size && isNaN(Number(formData.market_size))) {
          setError('Market size must be a valid number');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // Save to localStorage for now - could be extended to server
      localStorage.setItem('dealDraft', JSON.stringify(formData));
      alert('Draft saved successfully');
    } catch (err) {
      setError('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('review')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create deal
      const dealPayload = {
        title: formData.title || formData.company_name,
        company_name: formData.company_name,
        description: formData.company_description,
        industry: formData.industry,
        website: formData.company_website || null,
        funding_amount: formData.funding_amount_requested
          ? Math.round(Number(formData.funding_amount_requested))
          : null,
        valuation: formData.post_money_valuation
          ? Math.round(Number(formData.post_money_valuation))
          : formData.pre_money_valuation
            ? Math.round(Number(formData.pre_money_valuation))
            : null,
        stage: formData.stage,
        deal_type: formData.deal_type || 'equity',
        problem_statement: formData.problem_statement || null,
        solution: formData.solution || null,
        market_size: formData.market_size
          ? Math.round(Number(formData.market_size))
          : null,
        team_size: formData.founder_count ? Math.round(Number(formData.founder_count)) : 0,
      };

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealPayload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create deal');
      }

      const { data: newDeal } = await response.json();

      // Upload documents directly to Supabase storage (bypasses Vercel 4.5MB limit)
      if (formData.documents.length > 0 && newDeal.id) {
        for (const file of formData.documents) {
          const fileName = `${newDeal.id}/${Date.now()}-${file.name}`;

          // Upload file directly to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            continue;
          }

          // Create document record in database
          await supabase.from('deal_documents').insert({
            deal_id: newDeal.id,
            document_type: 'pitch_deck',
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: newDeal.creator_id,
            parse_status: 'pending',
          });
        }
      }

      // Clear draft
      localStorage.removeItem('dealDraft');

      // Redirect to deal detail page
      router.push(`/deals/${newDeal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-sunk)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--ink)] hover:text-[var(--ink)] mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-[var(--ink)] mb-2">List a New Deal</h1>
          <p className="text-[var(--ink-soft)]">
            Share your investment opportunity with our network of investors
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--ink-soft)]">
              Step {currentStepIndex + 1} of {STEPS.length}
            </p>
            <p className="text-sm font-medium text-[var(--ink-soft)]">
              {Math.round(progressPercent)}%
            </p>
          </div>
          <div className="w-full bg-[var(--bg-sunk)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[var(--ink)] h-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, i) => (
              <button
                key={step}
                onClick={() => i <= currentStepIndex && goToStep(step)}
                disabled={i > currentStepIndex}
                className={`text-xs font-medium capitalize transition-colors ${
                  i === currentStepIndex
                    ? 'text-[var(--ink)]'
                    : i < currentStepIndex
                      ? 'text-green-600 cursor-pointer'
                      : 'text-[var(--ink-faint)] cursor-not-allowed'
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[var(--bg-elev)] rounded-lg border border-[var(--line)] p-8 mb-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
                  Basic Information
                </h2>
                <p className="text-[var(--ink-soft)]">
                  Tell us about your company and the deal
                </p>
              </div>

              <Input
                label="Company Name *"
                placeholder="e.g., Acme Inc"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                containerClassName="w-full"
              />

              <div>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">
                  Company Description *
                </label>
                <textarea
                  placeholder="Describe your company, what you do, and why it matters"
                  value={formData.company_description}
                  onChange={(e) => handleInputChange('company_description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--line-strong)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ink)] text-[var(--ink)] placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--line-strong)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ink)] text-[var(--ink)] placeholder-gray-400"
                >
                  <option value="">Select an industry</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Company Website"
                placeholder="https://example.com"
                type="url"
                value={formData.company_website}
                onChange={(e) => handleInputChange('company_website', e.target.value)}
                containerClassName="w-full"
              />
            </div>
          )}

          {currentStep === 'details' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
                  Deal Details
                </h2>
                <p className="text-[var(--ink-soft)]">
                  Share the financial and structural details of this deal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">
                  Deal Stage *
                </label>
                <select
                  value={formData.stage}
                  onChange={(e) => handleInputChange('stage', e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--line-strong)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ink)] text-[var(--ink)] placeholder-gray-400"
                >
                  {DEAL_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Funding Amount Requested ($)"
                placeholder="e.g., 1000000"
                type="number"
                value={formData.funding_amount_requested}
                onChange={(e) => handleInputChange('funding_amount_requested', e.target.value)}
                containerClassName="w-full"
              />

              <Input
                label="Pre-Money Valuation ($)"
                placeholder="e.g., 5000000"
                type="number"
                value={formData.pre_money_valuation}
                onChange={(e) => handleInputChange('pre_money_valuation', e.target.value)}
                containerClassName="w-full"
              />

              <Input
                label="Post-Money Valuation ($)"
                placeholder="e.g., 6000000"
                type="number"
                value={formData.post_money_valuation}
                onChange={(e) => handleInputChange('post_money_valuation', e.target.value)}
                containerClassName="w-full"
              />

              <Input
                label="Equity Offered (%)"
                placeholder="e.g., 20"
                type="number"
                step="0.1"
                value={formData.equity_offered}
                onChange={(e) => handleInputChange('equity_offered', e.target.value)}
                containerClassName="w-full"
              />

              <Input
                label="Number of Founders"
                placeholder="e.g., 2"
                type="number"
                min="1"
                value={formData.founder_count}
                onChange={(e) => handleInputChange('founder_count', e.target.value)}
                containerClassName="w-full"
              />
            </div>
          )}

          {currentStep === 'narrative' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
                  Company Narrative
                </h2>
                <p className="text-[var(--ink-soft)]">
                  Tell the story of your company and opportunity
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">
                  Problem Statement
                </label>
                <textarea
                  placeholder="What problem are you solving?"
                  value={formData.problem_statement}
                  onChange={(e) => handleInputChange('problem_statement', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--line-strong)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ink)] text-[var(--ink)] placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--ink-soft)] mb-2">
                  Solution
                </label>
                <textarea
                  placeholder="How are you solving this problem?"
                  value={formData.solution}
                  onChange={(e) => handleInputChange('solution', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--line-strong)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ink)] text-[var(--ink)] placeholder-gray-400"
                />
              </div>

              <Input
                label="Market Size Opportunity ($)"
                placeholder="e.g., 5000000000"
                type="number"
                value={formData.market_size}
                onChange={(e) => handleInputChange('market_size', e.target.value)}
                containerClassName="w-full"
              />
            </div>
          )}

          {currentStep === 'documents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
                  Documents
                </h2>
                <p className="text-[var(--ink-soft)]">
                  Upload pitch deck, financials, or term sheet (optional)
                </p>
              </div>

              <DocumentUpload
                onFilesChange={(files) => handleInputChange('documents', files)}
                maxFiles={5}
              />
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">
                  Review Your Deal
                </h2>
                <p className="text-[var(--ink-soft)]">
                  Please review the information before submitting
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Company Name</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {formData.company_name}
                  </p>
                </div>

                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Industry</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {formData.industry}
                  </p>
                </div>

                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Deal Stage</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {DEAL_STAGES.find((s) => s.value === formData.stage)?.label}
                  </p>
                </div>

                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Funding Requested</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {formData.funding_amount_requested
                      ? `$${Number(formData.funding_amount_requested).toLocaleString()}`
                      : 'Not specified'}
                  </p>
                </div>

                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Valuation</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {formData.post_money_valuation
                      ? `$${Number(formData.post_money_valuation).toLocaleString()}`
                      : 'Not specified'}
                  </p>
                </div>

                <div className="bg-[var(--bg-sunk)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-soft)] mb-1">Documents Uploaded</p>
                  <p className="font-semibold text-[var(--ink)]">
                    {formData.documents.length} file(s)
                  </p>
                </div>
              </div>

              <div className="bg-[var(--accent-soft)] border border-[var(--line)] rounded-lg p-4">
                <p className="text-sm text-[var(--ink)]">
                  Once you submit, your deal will be reviewed by our system and made available
                  to investors. You'll receive an AI analysis within 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            variant="secondary"
            icon={<ChevronLeft className="h-5 w-5" />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveDraft}
              isLoading={isSavingDraft}
              variant="ghost"
              icon={<Save className="h-5 w-5" />}
            >
              Save Draft
            </Button>

            {currentStep === 'review' ? (
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                variant="primary"
              >
                Submit Deal
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant="primary"
                icon={<ChevronRight className="h-5 w-5" />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
