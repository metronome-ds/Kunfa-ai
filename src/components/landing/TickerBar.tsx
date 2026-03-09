'use client'

import { useEffect, useState } from 'react'

interface MarketData {
  name: string
  value: string
  change: string
  positive: boolean
}

interface CityTime {
  city: string
  flag: string
  timezone: string
  open: boolean
}

const cities: CityTime[] = [
  { city: 'New York', flag: '🇺🇸', timezone: 'America/New_York', open: true },
  { city: 'London', flag: '🇬🇧', timezone: 'Europe/London', open: true },
  { city: 'Dubai', flag: '🇦🇪', timezone: 'Asia/Dubai', open: false },
  { city: 'Singapore', flag: '🇸🇬', timezone: 'Asia/Singapore', open: false },
  { city: 'Tokyo', flag: '🇯🇵', timezone: 'Asia/Tokyo', open: false },
]

const marketData: MarketData[] = [
  { name: 'S&P 500', value: '5,234.18', change: '+1.2%', positive: true },
  { name: 'NASDAQ', value: '16,742.39', change: '+1.8%', positive: true },
  { name: 'BTC', value: '$67,432', change: '+3.4%', positive: true },
  { name: 'ETH', value: '$3,521', change: '-0.8%', positive: false },
  { name: 'VC Deals Q1', value: '3,847', change: '+12%', positive: true },
  { name: 'Avg Series A', value: '$18.2M', change: '+5.3%', positive: true },
]

function CityClockDisplay({ city }: { city: CityTime }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: city.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      setTime(timeStr)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [city.timezone])

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span>{city.flag}</span>
      <span className="text-gray-300">{city.city}</span>
      <span className="text-white font-medium">{time}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${city.open ? 'bg-kunfa' : 'bg-kunfa-red'}`} />
    </span>
  )
}

export default function TickerBar() {
  return (
    <div className="w-full bg-kunfa-navy text-xs py-2 overflow-hidden border-b border-gray-800">
      <div className="marquee-content">
        {[0, 1].map((dupeIdx) => (
          <div key={dupeIdx} className="flex items-center gap-6 px-4 shrink-0">
            {cities.map((city) => (
              <CityClockDisplay key={`${dupeIdx}-${city.city}`} city={city} />
            ))}
            <span className="text-gray-600">|</span>
            {marketData.map((item) => (
              <span key={`${dupeIdx}-${item.name}`} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-gray-400">{item.name}</span>
                <span className="text-white font-medium">{item.value}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  item.positive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {item.change}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
