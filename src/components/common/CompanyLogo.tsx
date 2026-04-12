'use client'

import Image from 'next/image'
import { useState } from 'react'

const SIZES = {
  sm: { container: 'w-8 h-8', text: 'text-xs', rounded: 'rounded-lg' },
  md: { container: 'w-10 h-10', text: 'text-sm', rounded: 'rounded-xl' },
  lg: { container: 'w-14 h-14', text: 'text-lg', rounded: 'rounded-2xl' },
} as const

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface CompanyLogoProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CompanyLogo({ name, logoUrl, size = 'md', className = '' }: CompanyLogoProps) {
  const s = SIZES[size]
  const [imgError, setImgError] = useState(false)

  if (logoUrl && !imgError) {
    return (
      <div className={`${s.container} ${s.rounded} overflow-hidden flex-shrink-0 bg-gray-100 ${className}`}>
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={56}
          height={56}
          className="w-full h-full object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div className={`${s.container} ${s.rounded} flex items-center justify-center flex-shrink-0 ${getColor(name)} ${className}`}>
      <span className={`${s.text} font-bold`}>{getInitials(name)}</span>
    </div>
  )
}
