import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kunfa.AI — AI-Native Infrastructure for Modern Investors',
  description: 'AI-powered venture intelligence platform. Get your Kunfa Score, connect with investors, and access institutional-grade deal analysis.',
  keywords: ['venture capital', 'AI scoring', 'startup evaluation', 'investment memo', 'deal flow'],
  openGraph: {
    title: 'Kunfa.AI — AI-Native Infrastructure for Modern Investors',
    description: 'AI-powered venture intelligence platform. Get your Kunfa Score and connect with investors.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-kunfa-text-primary">
        {children}
      </body>
    </html>
  )
}
