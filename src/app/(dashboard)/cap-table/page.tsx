'use client'

import FeatureGate from '@/components/common/FeatureGate'
import { PieChart } from 'lucide-react'

export default function CapTablePage() {
  return (
    <FeatureGate feature="cap_table">
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#007CF8]/10 flex items-center justify-center mx-auto mb-6">
          <PieChart className="w-8 h-8 text-[#007CF8]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Cap Table Management</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Visual cap table with ownership tracking, dilution modeling, and investor-ready exports. Coming soon.
        </p>
      </div>
    </FeatureGate>
  )
}
