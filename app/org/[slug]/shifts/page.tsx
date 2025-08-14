import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import connectDB from '@/lib/mongodb';
import Membership from '@/lib/models/Membership';
import { ShiftTracker } from '@/components/shift-tracker';
import { ShiftDashboard } from '@/components/shift-dashboard';
import { OrgNavigation } from '@/components/org-navigation';
import { OrgSwitcher } from '@/components/org-switcher';
import { UserMenu } from '@/components/user-menu';
import { OfflineStatus } from '@/components/offline-status';
import { Clock } from 'lucide-react';

interface ShiftsPageProps {
  params: {
    slug: string;
  };
}

export default async function ShiftsPage({ params }: ShiftsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  await connectDB();
  
  // Get user's membership in this organization
  const membership = await Membership.findOne({
    userId: session.user.id,
    slug: params.slug
  }).lean() as { role: string } | null;
  
  if (!membership) {
    redirect('/dashboard');
  }

  const isCarerOrViewer = membership.role === 'CARER' || membership.role === 'VIEWER';
  const isAdminOrOwner = membership.role === 'ADMIN' || membership.role === 'OWNER';

  // Mock organizations for demo - in real app this would come from user's memberships
  const mockOrgs = [
    { id: '1', name: 'Nurtiv Demo Care', slug: params.slug, role: membership.role },
  ];
  const currentOrg = mockOrgs[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {membership.role !== 'CARER' && (
              <OrgSwitcher currentOrg={currentOrg} organizations={mockOrgs} />
            )}
            <OrgNavigation orgSlug={params.slug} userRole={membership.role} />
            <OfflineStatus />
          </div>
          
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
              <p className="text-gray-600">
                {isCarerOrViewer 
                  ? 'Track your work shifts and hours'
                  : 'Manage and monitor team shifts'
                }
              </p>
            </div>
          </div>
        </div>

      {/* Show appropriate component based on user role */}
      {isCarerOrViewer && (
        <div className="max-w-md mx-auto">
          <ShiftTracker orgSlug={params.slug} />
        </div>
      )}
      
      {isAdminOrOwner && (
        <ShiftDashboard orgSlug={params.slug} />
      )}
      
      {/* Show both for admins who might also work shifts */}
      {isAdminOrOwner && (
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Personal Shift Tracker</h2>
            <p className="text-sm text-gray-600 mb-4">
              Track your own shifts when working directly with patients
            </p>
          </div>
          <ShiftTracker orgSlug={params.slug} />
        </div>
      )}
      </main>
    </div>
  );
}