import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Kunfa.AI',
  description: 'Kunfa.AI Privacy Policy — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Kunfa.AI</span>
          </Link>
          <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition">
            Terms of Service
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 9, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Kunfa.AI (&ldquo;the Platform&rdquo;) is operated by Metronome FZ-LLC, a company registered in Dubai, UAE. This Privacy Policy describes how we collect, use, store, and share your personal information when you use our Platform. We are committed to protecting your privacy and handling your data in accordance with applicable UAE data protection regulations and international best practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, email address, and job title (provided during registration)</li>
              <li>LinkedIn profile URL (optional, provided during onboarding)</li>
              <li>Company name, role, and professional details</li>
              <li>Payment information (processed by Stripe; we do not store card details)</li>
            </ul>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Company Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Company name, description, industry, stage, country, and website</li>
              <li>Founding team details (names, titles, emails, LinkedIn profiles)</li>
              <li>Financial metrics (raise amount, team size, founded year, traction data)</li>
            </ul>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Uploaded Documents</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Pitch deck files (PDF)</li>
              <li>Financial documents (PDF, optional)</li>
            </ul>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address and device information</li>
              <li>Pages visited, features used, and interaction patterns</li>
              <li>Scoring requests and timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI Scoring and Analysis:</strong> Your uploaded documents and company data are processed by AI models to generate investment readiness scores, grades, and analysis reports.</li>
              <li><strong>Company Profile Creation:</strong> Information you provide is used to create your public company profile, which is visible to investors on the Platform.</li>
              <li><strong>Investor Matching:</strong> Company profiles and scores are displayed to investors to facilitate deal discovery and evaluation.</li>
              <li><strong>Account Management:</strong> To authenticate your identity, manage your account, and communicate with you about your account or the Platform.</li>
              <li><strong>Payment Processing:</strong> To process payments for premium features such as the Kunfa Readiness Report.</li>
              <li><strong>Platform Improvement:</strong> Aggregated, anonymized data may be used to improve our scoring algorithms, platform features, and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Who Can See Your Information</h2>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Public Information</h3>
            <p>
              Your company profile — including company name, description, one-liner, industry, stage, country, Kunfa Score, and team information — is publicly visible to all authenticated users of the Platform.
            </p>

            <h3 className="text-base font-medium text-gray-900 mt-4 mb-2">Restricted Information</h3>
            <p>
              Your uploaded documents (pitch decks and financial documents) are <strong>not publicly accessible</strong>. Access is restricted to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>You (the document uploader / company owner)</li>
              <li>Authenticated investors who have added your company to their deal pipeline</li>
              <li>Authenticated investors who have added your company to their watchlist</li>
            </ul>
            <p className="mt-3">
              Document access is controlled through an authenticated server-side proxy. Raw file URLs are never exposed to clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. AI Processing</h2>
            <p>
              Your documents and company data are sent to third-party AI providers (currently Anthropic&apos;s Claude) for analysis and scoring. Important details about this processing:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Document text is extracted and sent to the AI model for analysis. The AI provider does not store your data beyond the processing session.</li>
              <li>AI-generated outputs (scores, analysis, recommendations) are stored on our platform and associated with your account.</li>
              <li>We do not use your data to train AI models. Our AI provider&apos;s data handling practices are governed by their own terms of service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention and Deletion</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Account data:</strong> Retained while your account is active. Upon account deletion request, personal data is removed within 30 days.</li>
              <li><strong>Uploaded documents:</strong> Retained while your account is active. Deleted upon account deletion or upon your request.</li>
              <li><strong>Generated reports:</strong> Paid reports are retained for the lifetime of your account. They may be retained after account deletion to fulfill our obligations to paying customers.</li>
              <li><strong>Anonymized data:</strong> Aggregated, anonymized analytics data may be retained indefinitely for platform improvement.</li>
            </ul>
            <p className="mt-3">
              To request deletion of your account and associated data, contact us at <a href="mailto:hello@vitality.capital" className="text-[#10B981] hover:underline">hello@vitality.capital</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Third-Party Services</h2>
            <p>
              We use the following third-party services to operate the Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Supabase:</strong> Database hosting, user authentication, and data storage (servers in the US/EU).</li>
              <li><strong>Vercel:</strong> Application hosting, file storage (Vercel Blob), and content delivery.</li>
              <li><strong>Stripe:</strong> Payment processing. We do not store your credit card information; it is handled entirely by Stripe in accordance with PCI DSS standards.</li>
              <li><strong>Anthropic (Claude):</strong> AI model provider for document analysis and scoring. Documents are processed in real-time and are not stored by the provider.</li>
            </ul>
            <p className="mt-3">
              Each third-party provider is bound by their own privacy policies and data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Encryption in transit (HTTPS/TLS) for all data transfers</li>
              <li>Encryption at rest for stored data</li>
              <li>Role-based access controls and row-level security policies</li>
              <li>Authenticated server-side proxy for document access</li>
              <li>Rate limiting on sensitive endpoints</li>
            </ul>
            <p className="mt-3">
              While we strive to protect your information, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data and account.</li>
              <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to certain processing of your personal data.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at <a href="mailto:hello@vitality.capital" className="text-[#10B981] hover:underline">hello@vitality.capital</a>. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies</h2>
            <p>
              The Platform uses essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies. Essential cookies are necessary for the Platform to function and cannot be disabled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children&apos;s Privacy</h2>
            <p>
              The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries other than the UAE, including the United States and European Union, where our third-party service providers operate. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated via email or prominent notice on the Platform. Your continued use of the Platform after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>
              For questions about this Privacy Policy or our data practices, please contact:
            </p>
            <p className="mt-2">
              <strong>Metronome FZ-LLC</strong><br />
              Dubai, United Arab Emirates<br />
              Email: <a href="mailto:hello@vitality.capital" className="text-[#10B981] hover:underline">hello@vitality.capital</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
