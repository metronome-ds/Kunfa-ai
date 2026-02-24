import { Sidebar } from '@/components/common/Sidebar';
import { Navbar } from '@/components/common/Navbar';
import { createClient } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication on the server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 flex flex-col flex-1 overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Content Area */}
        <div className="flex-1 overflow-auto pt-16">
          <div className="min-h-screen">{children}</div>
        </div>
      </div>
    </div>
  );
}
