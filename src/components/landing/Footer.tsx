import Link from 'next/link'
import KunfaLogo from '@/components/common/KunfaLogo'

export default function Footer() {
  return (
    <footer className="bg-kunfa-navy py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-4">
            <KunfaLogo height={28} inverted />
          </div>

          {/* Company info */}
          <p className="text-gray-400 text-sm mb-6">
            Alif Fund LLC &middot; Dubai, UAE
          </p>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Terms
            </Link>
            <span className="text-gray-700">|</span>
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Privacy
            </Link>
            <span className="text-gray-700">|</span>
            <a
              href="https://www.linkedin.com/company/alif-fund/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              LinkedIn
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="mailto:invest@kunfa.ai"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Kunfa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
