'use client'

import { useState } from 'react'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import StartupSection from '@/components/landing/StartupSection'
import InvestorSection from '@/components/landing/InvestorSection'
import PricingSection from '@/components/landing/PricingSection'
import ExpertServicesSection from '@/components/landing/ExpertServicesSection'
import Footer from '@/components/landing/Footer'
import ScoreModal from '@/components/scoring/ScoreModal'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <main className="min-h-screen bg-white">
      <Navbar onApplyNow={openModal} />
      <Hero onApplyNow={openModal} />
      <HowItWorks />
      <StartupSection onApplyNow={openModal} />
      <InvestorSection />
      <PricingSection onApplyNow={openModal} />
      <ExpertServicesSection />
      <Footer />
      <ScoreModal isOpen={isModalOpen} onClose={closeModal} />
    </main>
  )
}
