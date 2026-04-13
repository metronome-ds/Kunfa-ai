import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server';
import { DealScorer } from '@/components/ai/DealScorer';
import { CompanyBrief } from '@/components/ai/CompanyBrief';
import { TermSheetAnalyzer } from '@/components/ai/TermSheetAnalyzer';

interface ScorePageProps {
  params: Promise<{ id: string }>;
}

export default async function ScorePage({ params }: ScorePageProps) {
  const { id: dealId } = await params;
  const user = await getServerUser();

  if (!user) {
    notFound();
  }

  // Fetch deal and verify access
  const supabase = await createServerSupabaseClient();
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select(
      `
      id,
      created_by,
      assigned_to,
      ai_score,
      stage,
      company_pages!company_id (
        id,
        company_name,
        slug,
        overall_score,
        industry
      )
    `
    )
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    notFound();
  }

  const company = deal.company_pages as any;

  // Check access — allow creator, assignee, or admin
  if (deal.assigned_to !== user.id && deal.created_by !== user.id) {
    const { data: userData } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      notFound();
    }
  }

  const termSheetDoc: { id: string } | null = null;

  // Scoring data not available from deals table — DealScorer will handle the "not scored" state
  const scoringData = undefined;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/deals/${dealId}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              Back to Deal
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{company?.company_name || 'Unknown Company'}</h1>
          <p className="text-gray-600 mt-1">AI-Powered Investment Analysis</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-12">
          {/* Deal Score Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Investment Score</h2>
            <div className="bg-white rounded-lg p-6">
              <DealScorer dealId={dealId} scores={scoringData} />
            </div>
          </section>

          {/* Tabs Container */}
          <div className="space-y-6">
            {/* Company Brief Tab */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Company Brief</h2>
              <div className="bg-white rounded-lg p-6">
                <CompanyBrief dealId={dealId} />
              </div>
            </section>

            {/* Term Sheet Analysis Tab */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Term Sheet Analysis</h2>
              <div className="bg-white rounded-lg p-6">
                <TermSheetAnalyzer
                  dealId={dealId}
                  documentId={undefined}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
