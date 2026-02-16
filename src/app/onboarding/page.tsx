'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle, ArrowRight, Briefcase, TrendingUp, Zap } from 'lucide-react';

type Role = 'founder' | 'investor' | 'service_provider';

const ROLES = [
  {
    id: 'founder' as Role,
    title: 'Founder',
    description: 'Fundraising & company building',
    icon: Briefcase,
  },
  {
    id: 'investor' as Role,
    title: 'Investor',
    description: 'Discover deals, research & portfolio',
    icon: TrendingUp,
  },
  {
    id: 'service_provider' as Role,
    title: 'Service Provider',
    description: 'Offer professional services',
    icon: Zap,
  },
];

const INTERESTS = [
  'AI/ML',
  'FinTech',
  'HealthTech',
  'CleanTech',
  'SaaS',
  'B2B',
  'B2C',
  'EdTech',
  'BioTech',
  'Real Estate',
  'E-Commerce',
  'Crypto/Web3',
  'IoT',
  'Cybersecurity',
  'Consumer',
  'Enterprise',
];

const MATCHED_TOOLS = {
  founder: [
    'List a Deal',
    'AI Company Briefs',
    'Valuation Calculator',
    'Deal Pipeline',
  ],
  investor: [
    'Deal Marketplace',
    'AI Deal Scorer',
    'Portfolio Tracker',
    'Pipeline',
  ],
  service_provider: [
    'Services Marketplace',
    'People Directory',
  ],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: null as Role | null,
    interests: [] as string[],
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
      setIsLoading(false);
    };

    getUser();
  }, [router]);

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.role) {
      alert('Please select a role');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: formData.role,
          interests: formData.interests,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to complete onboarding:', error);
        alert('Failed to save profile. Please try again.');
        setIsSubmitting(false);
        return;
      }

      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white">Kunfa AI</h1>
          <p className="text-gray-400 mt-1">Deal Flow Intelligence</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-8 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step > s ? <CheckCircle size={20} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-1 w-12 transition-all ${
                    step > s ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  What best describes you?
                </h2>
                <p className="text-gray-400">Choose the role that fits you best</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {ROLES.map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isSelected = formData.role === roleOption.id;

                  return (
                    <button
                      key={roleOption.id}
                      onClick={() =>
                        setFormData({ ...formData, role: roleOption.id })
                      }
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    >
                      <Icon
                        size={32}
                        className={`mb-3 ${
                          isSelected ? 'text-blue-400' : 'text-gray-400'
                        }`}
                      />
                      <h3 className="font-semibold text-white mb-1">
                        {roleOption.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {roleOption.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Interests Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  What are your interests?
                </h2>
                <p className="text-gray-400">Select all that apply</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                {INTERESTS.map((interest) => {
                  const isSelected = formData.interests.includes(interest);

                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div>
                <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  You're all set!
                </h2>
                <p className="text-gray-400 mb-6">
                  Here are the tools available to you
                </p>
              </div>

              {formData.role && (
                <div className="bg-gray-700/50 rounded-xl p-6 text-left">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Your Matched Tools
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MATCHED_TOOLS[formData.role].map((tool) => (
                      <div
                        key={tool}
                        className="flex items-center gap-3 p-3 bg-gray-600/50 rounded-lg"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-gray-200">{tool}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8 pt-8 border-t border-gray-600">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 rounded-lg bg-gray-700 hover:bg-gray-600 px-6 py-3 font-semibold text-white transition-all"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !formData.role) {
                    alert('Please select a role');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                Next <ArrowRight size={18} />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-3 font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating account...
                  </>
                ) : (
                  <>
                    Go to Dashboard <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
