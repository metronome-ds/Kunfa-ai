'use client'

import { useState } from 'react'
import TickerBar from '@/components/landing/TickerBar'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import InvestorSection from '@/components/landing/InvestorSection'
import StartupSection from '@/components/landing/StartupSection'
import DebtProviderSection from '@/components/landing/DebtProviderSection'
import PricingSection from '@/components/landing/PricingSection'
import Footer from '@/components/landing/Footer'
import ScoreModal from '@/components/scoring/ScoreModal'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <main className="min-h-screen">
      <TickerBar />
      <Navbar onApplyNow={openModal} />
      <Hero onApplyNow={openModal} />
      <InvestorSection />
      <StartupSection onApplyNow={openModal} />
      <DebtProviderSection />
      <PricingSection onApplyNow={openModal} />
      <Footer />
      <ScoreModal isOpen={isModalOpen} onClose={closeModal} />
    </main>
  )
}
