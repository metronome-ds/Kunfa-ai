export default function Footer() {
  return (
    <footer id="about" className="bg-kunfa-navy py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-kunfa-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <span className="text-white font-semibold text-lg">Kunfa.AI</span>
        </div>
        <p className="text-gray-400 text-sm mb-2">
          A Vitality Capital Platform
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Kunfa 2.0 — Expanding to PE & real estate
        </p>
        <div className="flex items-center justify-center gap-6">
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
            href="mailto:hello@vitality.capital"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Contact
          </a>
        </div>
        <p className="text-gray-600 text-xs mt-8">
          &copy; {new Date().getFullYear()} Kunfa.AI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
