import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-kunfa-navy py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-kunfa-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-white font-semibold text-lg">Kunfa.AI</span>
          </div>

          {/* Company info */}
          <p className="text-gray-400 text-sm mb-6">
            Metronome FZ-LLC &middot; Dubai, UAE
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
              href="https://linkedin.com/company/kunfa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              LinkedIn
            </a>
            <span className="text-gray-700">|</span>
            <a
              href="mailto:hello@kunfa.ai"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Kunfa.AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
