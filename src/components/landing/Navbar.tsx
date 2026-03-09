'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavbarProps {
  onApplyNow: () => void
}

export default function Navbar({ onApplyNow }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-kunfa-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-kunfa-navy font-semibold text-lg">Kunfa.AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium transition-colors">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium transition-colors">Pricing</a>
            <Link href="/login" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium transition-colors">Sign In</Link>
            <button
              onClick={onApplyNow}
              className="bg-kunfa-green hover:bg-kunfa-green-dark text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Get Your Score
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-gray-600 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4">
            <div className="flex flex-col gap-3">
              <a href="#how-it-works" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>How It Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>Pricing</a>
              <Link href="/login" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/signup" className="text-gray-600 hover:text-kunfa-navy text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              <button
                onClick={() => { onApplyNow(); setMobileOpen(false) }}
                className="bg-kunfa-green hover:bg-kunfa-green-dark text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors w-fit"
              >
                Get Your Score
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
