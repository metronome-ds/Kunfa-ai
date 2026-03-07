import Sidebar from '@/components/dashboard/Sidebar'
import DashboardNav from '@/components/dashboard/DashboardNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0F172A]">
      <Sidebar />
      <div className="ml-64 flex flex-col flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-auto pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
