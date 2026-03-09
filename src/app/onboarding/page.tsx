'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle, ArrowRight, User, Target, FileText } from 'lucide-react';
import { STAGES, INDUSTRIES } from '@/lib/constants';
import KunfaLogo from '@/components/common/KunfaLogo';

const SECTORS = INDUSTRIES.filter(i => i !== 'Other');

const REGIONS = [
  'North America', 'Europe', 'MENA', 'Sub-Saharan Africa',
  'South Asia', 'Southeast Asia', 'East Asia', 'Latin America',
  'Australia / NZ', 'Global',
];

const STEP_CONFIG = [
  { label: 'About You', icon: User },
  { label: 'Investment Focus', icon: Target },
  { label: 'Thesis', icon: FileText },
];

export default function InvestorOnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Step 1: About You
  const [fullName, setFullName] = useState('');
  const [fundName, setFundName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Step 2: Investment Focus
  const [aum, setAum] = useState('');
  const [ticketMin, setTicketMin] = useState('');
  const [ticketMax, setTicketMax] = useState('');
  const [stageFocus, setStageFocus] = useState<string[]>([]);
  const [sectorInterests, setSectorInterests] = useState<string[]>([]);
  const [geoFocus, setGeoFocus] = useState<string[]>([]);

  // Step 3: Investment Thesis
  const [investmentThesis, setInvestmentThesis] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Pre-fill name from profile if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, fund_name, job_title, linkedin_url, onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.push('/deals');
        return;
      }

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.fund_name) setFundName(profile.fund_name);
      if (profile?.job_title) setJobTitle(profile.job_title);
      if (profile?.linkedin_url) setLinkedinUrl(profile.linkedin_url);

      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  function toggleItem(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'investor',
          full_name: fullName,
          fund_name: fundName || null,
          job_title: jobTitle || null,
          linkedin_url: linkedinUrl || null,
          aum: aum ? Number(aum) : null,
          ticket_size_min: ticketMin ? Number(ticketMin) : null,
          ticket_size_max: ticketMax ? Number(ticketMax) : null,
          stage_focus: stageFocus.length > 0 ? stageFocus : null,
          sector_interests: sectorInterests.length > 0 ? sectorInterests : null,
          geo_focus: geoFocus.length > 0 ? geoFocus : null,
          investment_thesis: investmentThesis || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      router.push('/deals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (step === 1 && !fullName.trim()) {
      setError('Full name is required');
      return;
    }
    setError('');
    setStep(step + 1);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <KunfaLogo height={32} inverted />
          </div>
          <p className="text-gray-400">Set up your investor profile</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-4 mb-10">
          {STEP_CONFIG.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step >= stepNum;
            const isDone = step > stepNum;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-5 h-5" /> : stepNum}
                  </div>
                  <span className={`text-sm hidden sm:inline ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`h-0.5 w-10 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: About You */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">About You</h2>
                <p className="text-gray-400 text-sm">Tell us a bit about yourself</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fund / Firm Name</label>
                <input
                  type="text"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Ventures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Partner, Analyst, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          )}

          {/* Step 2: Investment Focus */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Investment Focus</h2>
                <p className="text-gray-400 text-sm">Help us match you with the right deals</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">AUM (USD)</label>
                  <input
                    type="number"
                    value={aum}
                    onChange={(e) => setAum(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 50000000"
                  />
                </div>
                <div />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Min Check Size (USD)</label>
                  <input
                    type="number"
                    value={ticketMin}
                    onChange={(e) => setTicketMin(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 100000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Check Size (USD)</label>
                  <input
                    type="number"
                    value={ticketMax}
                    onChange={(e) => setTicketMax(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stage Focus</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => toggleItem(stageFocus, stage, setStageFocus)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        stageFocus.includes(stage)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sector Interests</label>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((sector) => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => toggleItem(sectorInterests, sector, setSectorInterests)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        sectorInterests.includes(sector)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Geographic Focus</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleItem(geoFocus, region, setGeoFocus)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        geoFocus.includes(region)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Investment Thesis */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Investment Thesis</h2>
                <p className="text-gray-400 text-sm">Optional — describe your investment approach</p>
              </div>

              <div>
                <textarea
                  value={investmentThesis}
                  onChange={(e) => setInvestmentThesis(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="We invest in early-stage B2B SaaS companies in emerging markets that leverage AI to solve industry-specific problems..."
                />
                <p className="text-xs text-gray-500 mt-1">This helps founders understand your focus areas</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-700">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setError(''); setStep(step - 1); }}
                className="px-6 py-2.5 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {step < 3 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition disabled:opacity-50"
                >
                  Skip & Finish
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
