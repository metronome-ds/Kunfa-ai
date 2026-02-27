'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavbarProps {
  onApplyNow: () => void
}

export default function Navbar({ onApplyNow }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 bg-kunfa-navy border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-kunfa-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-white font-semibold text-lg">Kunfa.AI</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#product" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Product</a>
            <a href="#pricing" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Pricing</a>
            <a href="#about" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">About</a>
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Sign In</Link>
            <button
              onClick={onApplyNow}
              className="bg-kunfa-green hover:bg-kunfa-green-dark text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-white p-2"
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
          <div className="md:hidden pb-4 border-t border-gray-800 mt-2 pt-4">
            <div className="flex flex-col gap-3">
              <a href="#product" className="text-gray-300 hover:text-white text-sm font-medium px-2 py-1">Product</a>
              <a href="#pricing" className="text-gray-300 hover:text-white text-sm font-medium px-2 py-1">Pricing</a>
              <a href="#about" className="text-gray-300 hover:text-white text-sm font-medium px-2 py-1">About</a>
              <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/signup" className="text-gray-300 hover:text-white text-sm font-medium px-2 py-1" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              <button
                onClick={() => { onApplyNow(); setMobileOpen(false) }}
                className="bg-kunfa-green hover:bg-kunfa-green-dark text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors w-fit"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
