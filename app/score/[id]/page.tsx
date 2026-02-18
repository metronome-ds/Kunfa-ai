'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TeaserScore from '@/components/scoring/TeaserScore'

interface ScoreResult {
  overall_score: number
  percentile: number
  summary: string
  investment_readiness: string
  dimensions: {
    team: { score: number; letter_grade: string; headline: string }
    market: { score: number; letter_grade: string; headline: string }
    product: { score: number; letter_grade: string; headline: string }
    financial: { score: number; letter_grade: string; headline: string }
  }
}

export default function ScorePage() {
  const params = useParams()
  const id = params.id as string
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchScore() {
      try {
        const res = await fetch(`/api/score/${id}`)
        if (!res.ok) throw new Error('Failed to load score')
        const data = await res.json()
        setResult(data.teaser)
      } catch {
        setError('Unable to load your score. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchScore()
  }, [id])

  const handleUnlock = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Failed to initiate checkout')
    }
  }

  return (
    <div className="min-h-screen bg-kunfa-light-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full">
        {/* Header */}
        <div className="bg-kunfa-navy rounded-t-2xl px-6 py-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-kunfa-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">K</span>
          </div>
          <span className="text-white font-semibold">Kunfa.AI</span>
        </div>

        {loading && (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-kunfa-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-kunfa-text-secondary">Loading your score...</p>
          </div>
        )}

        {error && (
          <div className="p-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <a href="/" className="text-kunfa-green font-semibold hover:underline">Return Home</a>
          </div>
        )}

        {result && (
          <TeaserScore result={result} submissionId={id} onUnlock={handleUnlock} />
        )}
      </div>
    </div>
  )
}
