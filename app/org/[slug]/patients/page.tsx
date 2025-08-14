'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Users, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PatientCard } from '@/components/patient-card';
import { OfflineStatus } from '@/components/offline-status';
import { OrgSwitcher } from '@/components/org-switcher';
import { UserMenu } from '@/components/user-menu';
import { useSession } from 'next-auth/react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  carePlan?: string;
  lastVisit?: string;
  urgentActions?: number;
  recentNotes?: number;
  conditions?: string[];
  status?: 'stable' | 'monitoring' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high';
}

export default function PatientsPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);

  // Mock organizations for demo
  const mockOrgs = [
    { id: '1', name: 'Nurtiv Demo Care', slug: params.slug, role: 'OWNER' },
    { id: '2', name: 'Community Care Plus', slug: 'community-care', role: 'ADMIN' },
  ];

  const currentOrg = mockOrgs[0];

  const bulkAnalyzePatients = async () => {
    setIsBulkAnalyzing(true);
    try {
      const analysisPromises = patients.map(async (patient) => {
        try {
          const response = await fetch(`/api/org/${params.slug}/patients/${patient.id}/analyze-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            return {
              id: patient.id,
              status: result.analysis.status,
              riskLevel: result.analysis.riskLevel,
              success: true
            };
          }
          return { id: patient.id, success: false };
        } catch (error) {
          console.error(`Failed to analyze patient ${patient.id}:`, error);
          return { id: patient.id, success: false };
        }
      });
      
      const results = await Promise.all(analysisPromises);
      const successCount = results.filter(r => r.success).length;
      
      // Update patients state with new analysis results
      setPatients(prevPatients => 
        prevPatients.map(patient => {
          const result = results.find(r => r.id === patient.id && r.success);
          if (result) {
            return {
              ...patient,
              status: result.status,
              riskLevel: result.riskLevel
            };
          }
          return patient;
        })
      );
      
      alert(`Successfully analyzed ${successCount} out of ${patients.length} patients.`);
    } catch (error) {
      console.error('Bulk analysis error:', error);
      alert('Failed to perform bulk analysis. Please try again.');
    } finally {
      setIsBulkAnalyzing(false);
    }
  };

  // Fetch patients data from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch(`/api/org/${params.slug}/patients`);
        if (response.ok) {
          const data = await response.json();
          // Transform the data to match the expected format
          const transformedPatients = data.patients.map((patient: any, index: number) => {
            // Mock data for demonstration - in real app this would come from patient records
            const mockConditions = [
              ['heart disease', 'hypertension'],
              ['diabetes', 'neuropathy'],
              ['dementia', 'mobility issues'],
              ['arthritis'],
              ['heart failure', 'diabetes']
            ];
            const mockStatuses = ['stable', 'monitoring', 'critical', 'stable', 'monitoring'];
            const mockRiskLevels = ['low', 'medium', 'high', 'low', 'medium'];
            const mockUrgentActions = [0, 2, 4, 1, 3];
            
            return {
              id: patient._id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              dob: patient.dob,
              carePlan: patient.carePlan,
              lastVisit: patient.lastVisit || patient.createdAt, // Using createdAt as placeholder for lastVisit
              urgentActions: mockUrgentActions[index % mockUrgentActions.length],
              recentNotes: Math.floor(Math.random() * 5) + 1,
              conditions: patient.keyInfo?.conditions || mockConditions[index % mockConditions.length],
              status: patient.status,
              riskLevel: patient.riskLevel
            };
          });
          setPatients(transformedPatients);
        } else if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/login';
          return;
        } else {
          console.error('Failed to fetch patients');
          setPatients([]);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {session?.user?.role !== 'CARER' && (
              <OrgSwitcher currentOrg={currentOrg} organizations={mockOrgs} />
            )}
            <OfflineStatus />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={bulkAnalyzePatients}
              disabled={isBulkAnalyzing || patients.length === 0}
              className="mr-2"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isBulkAnalyzing ? 'Analyzing...' : 'Analyze All Patients'}
            </Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-teal-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
              <p className="text-gray-600">Manage your care recipients</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Patients Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={{
                  id: patient.id,
                  firstName: patient.firstName,
                  lastName: patient.lastName,
                  dob: patient.dob,
                  carePlan: patient.carePlan,
                  lastVisit: patient.lastVisit,
                  urgentActions: patient.urgentActions,
                  recentNotes: patient.recentNotes,
                  conditions: patient.conditions,
                  status: patient.status,
                  riskLevel: patient.riskLevel
                }}
                orgSlug={params.slug}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first patient'}
            </p>
            {!searchQuery && (
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add First Patient
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}