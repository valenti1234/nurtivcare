'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, User, Calendar, FileText, Mic, Brain, Globe, Heart, Trash2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceRecorder } from '@/components/voice-recorder';
import { AddNoteDialog } from '@/components/add-note-dialog';
import { PatientTodos } from '@/components/patient-todos';
import { PatientPhotoUpload } from '@/components/patient-photo-upload';
import { PatientLocation } from '@/components/patient-location';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dob: string;
  carePlan: string;
  status?: 'stable' | 'monitoring' | 'critical';
  riskLevel?: 'low' | 'medium' | 'high';
  lastAnalyzed?: string;
  analysisReasoning?: string;
  analysisRecommendations?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    radius?: number;
  };
  photo?: {
    url: string;
    filename: string;
    uploadedAt: string;
    verified: boolean;
  };
  keyInfo: {
    allergies: string;
    emergencyContact: string;
    gp: string;
    conditions: string[];
  };
}

interface Note {
  _id: string;
  rawText: string;
  aiSummary: {
    observations: string;
    risks: string;
    actions: string;
  };
  mood: string;
  createdAt: string;
  authorName: string;
}

export default function PatientDetailPage({ 
  params 
}: { 
  params: { slug: string; id: string } 
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRecording, setIsRecording] = useState(false);
  const [familyUpdate, setFamilyUpdate] = useState('');
  const [quickBrief, setQuickBrief] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();

  // Fetch patient data from API
  useEffect(() => {
    fetchPatientData();
  }, [params.id]);

  const fetchPatientData = async () => {
    try {
       // Fetch patient data
    const patientResponse = await fetch(`/api/org/${params.slug}/patients/${params.id}`);
       if (patientResponse.status === 401) {
         // Redirect to login if unauthorized
         window.location.href = '/login';
         return;
       }
       if (!patientResponse.ok) {
         setPatient(null);
         setNotes([]);
         return;
       }
      const patientData = await patientResponse.json();
      setPatient(patientData);

      // Fetch notes data
    const notesResponse = await fetch(`/api/org/${params.slug}/patients/${params.id}/notes`);
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNotes(notesData);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      setPatient(null);
      setNotes([]);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log('Recording complete:', audioBlob.size, 'bytes');
    // In real app, this would upload and transcribe
  };

  const generateQuickBrief = () => {
    if (!patient) return;
    
    const latestNotes = notes.slice(0, 3);
    const brief = `Quick brief for ${patient.firstName}: Recent visits show ${latestNotes.length > 0 ? latestNotes[0].aiSummary.observations : 'normal care routine'}. Key focus areas include medication compliance and mobility monitoring. ${latestNotes.some(n => n.aiSummary.risks !== 'None identified') ? 'Some risks have been identified that require attention.' : 'No significant risks identified.'}`;
    
    setQuickBrief(brief);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/org/${params.slug}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove note from state
        setNotes(prev => prev.filter(note => note._id !== noteId));
        toast({
          title: 'Success',
          description: 'Note deleted successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete note',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
    }
  };

  const analyzePatientStatus = async () => {
    if (!patient) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/org/${params.slug}/patients/${params.id}/analyze-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update patient state with new analysis
        setPatient(prev => prev ? {
          ...prev,
          status: result.analysis.status,
          riskLevel: result.analysis.riskLevel,
          lastAnalyzed: new Date().toISOString(),
          analysisReasoning: result.analysis.reasoning,
          analysisRecommendations: result.analysis.recommendations
        } : null);
        
        toast({
          title: 'Analysis Complete',
          description: `Patient status updated to ${result.analysis.status} with ${result.analysis.riskLevel} risk level.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Analysis Failed',
          description: error.error || 'Failed to analyze patient status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error analyzing patient status:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze patient status',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFamilyUpdate = () => {
    if (!patient) return;
    
    const pronoun = patient.firstName === 'Robert' || patient.firstName === 'Frank' ? 'he' : 'she';
    const possessive = patient.firstName === 'Robert' || patient.firstName === 'Frank' ? 'his' : 'her';
    
    const update = `Dear family, I wanted to share a positive update about ${patient.firstName}. Over the past few visits, ${pronoun} has been taking ${possessive} medications consistently and remains engaged with daily activities. We're monitoring ${possessive} care plan closely and ensuring ${pronoun} feels safe and comfortable. ${patient.firstName} speaks of you all fondly and is looking forward to your next visit. Please don't hesitate to reach out if you have any questions about ${possessive} care.`;
    
    setFamilyUpdate(update);
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Patient not found</div>
          <Link href={`/org/${params.slug}/patients`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const age = Math.floor(
    (Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Header - Mobile Only */}
      <header className="lg:hidden bg-white border-b border-gray-200 pl-16 pr-4 py-4 relative z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Age {age}
              </span>
            </div>
          </div>
          {patient.photo?.url ? (
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-teal-600">
              <Image 
                src={patient.photo.url} 
                alt={`${patient.firstName} ${patient.lastName}`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          ) : (
            <User className="h-10 w-10 text-teal-600" />
          )}
        </div>
      </header>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-6 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white shadow-lg"
        >
          {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50
        lg:translate-x-0 lg:static lg:w-72 lg:shadow-none lg:border-r lg:border-gray-200 lg:flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Desktop Header */}
        <div className="hidden lg:block p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {patient.photo?.url ? (
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-teal-600">
                <Image 
                  src={patient.photo.url} 
                  alt={`${patient.firstName} ${patient.lastName}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            ) : (
              <User className="h-8 w-8 text-teal-600" />
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-sm text-gray-600">Age {age} • Born {format(new Date(patient.dob), 'MMM d, yyyy')}</p>
            </div>
          </div>
        </div>
        
        {/* Mobile Header */}
        <div className="lg:hidden p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {patient.photo?.url ? (
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-teal-600">
                <Image 
                  src={patient.photo.url} 
                  alt={`${patient.firstName} ${patient.lastName}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            ) : (
              <User className="h-8 w-8 text-teal-600" />
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-sm text-gray-600">Age {age}</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <Link href={`/org/${params.slug}/patients`}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patients
              </Button>
            </Link>
          </div>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Overview</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveTab('notes');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'notes' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Notes</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveTab('todos');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'todos' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span>To-Do</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveTab('record');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'record' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Mic className="h-5 w-5" />
                <span>Record</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveTab('brief');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'brief' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="h-5 w-5" />
                <span>Quick Brief</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveTab('family');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'family' 
                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className="h-5 w-5" />
                <span>Family Update</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:overflow-hidden">
        <div className="h-full lg:overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Key Information Card - Moved to top */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Information</CardTitle>
                  <CardDescription>Important details and contacts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <strong className="text-sm">Allergies:</strong>
                    <p className="text-sm text-gray-600">{patient.keyInfo.allergies}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Emergency Contact:</strong>
                    <p className="text-sm text-gray-600">{patient.keyInfo.emergencyContact}</p>
                  </div>
                  <div>
                    <strong className="text-sm">GP:</strong>
                    <p className="text-sm text-gray-600">{patient.keyInfo.gp}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Conditions:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {patient.keyInfo.conditions.map((condition: string, index: number) => (
                        <Badge key={index} variant="outline">{condition}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Care Plan Card - Moved to top */}
              <Card>
                <CardHeader>
                  <CardTitle>Care Plan</CardTitle>
                  <CardDescription>Current care requirements and routine</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Care Category</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patient.carePlan.split('.').filter(item => item.trim()).map((item, index) => {
                          const trimmedItem = item.trim();
                          if (!trimmedItem) return null;
                          
                          // Try to identify category and details
                          let category = 'General Care';
                          let details = trimmedItem;
                          
                          if (trimmedItem.toLowerCase().includes('meal') || trimmedItem.toLowerCase().includes('food')) {
                            category = 'Nutrition';
                          } else if (trimmedItem.toLowerCase().includes('medication') || trimmedItem.toLowerCase().includes('medicine')) {
                            category = 'Medication';
                          } else if (trimmedItem.toLowerCase().includes('mobility') || trimmedItem.toLowerCase().includes('physiotherapy')) {
                            category = 'Mobility & Therapy';
                          } else if (trimmedItem.toLowerCase().includes('housekeeping') || trimmedItem.toLowerCase().includes('cleaning')) {
                            category = 'Household Support';
                          } else if (trimmedItem.toLowerCase().includes('shopping') || trimmedItem.toLowerCase().includes('grocery')) {
                            category = 'Shopping & Errands';
                          } else if (trimmedItem.toLowerCase().includes('personal care') || trimmedItem.toLowerCase().includes('hygiene')) {
                            category = 'Personal Care';
                          } else if (trimmedItem.toLowerCase().includes('social') || trimmedItem.toLowerCase().includes('companionship')) {
                            category = 'Social Support';
                          }
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-3 font-medium text-gray-800">{category}</td>
                              <td className="py-3 px-3 text-gray-600">{details}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Photo Upload Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Patient Photo
                  </CardTitle>
                  <CardDescription>Upload photo for ID verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientPhotoUpload 
                    patientId={params.id} 
                    orgSlug={params.slug}
                    currentPhoto={patient.photo}
                    onPhotoUpdate={fetchPatientData}
                  />
                </CardContent>
              </Card>

              {/* Location Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-600" />
                    Patient Location
                  </CardTitle>
                  <CardDescription>Set location for carer shift matching</CardDescription>
                </CardHeader>
                <CardContent>
                  <PatientLocation 
                    patientId={params.id} 
                    orgSlug={params.slug}
                    currentLocation={patient.location}
                    onLocationUpdate={fetchPatientData}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI Health Analysis
                  </CardTitle>
                  <CardDescription>AI-powered status and risk assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <strong className="text-sm">Status:</strong>
                      <div className="mt-1">
                        {patient.status ? (
                          <Badge 
                            variant={patient.status === 'critical' ? 'destructive' : patient.status === 'monitoring' ? 'default' : 'secondary'}
                            className={patient.status === 'critical' ? 'bg-red-100 text-red-800' : patient.status === 'monitoring' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                          >
                            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Not analyzed</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <strong className="text-sm">Risk Level:</strong>
                      <div className="mt-1">
                        {patient.riskLevel ? (
                          <Badge 
                            variant={patient.riskLevel === 'high' ? 'destructive' : patient.riskLevel === 'medium' ? 'default' : 'secondary'}
                            className={patient.riskLevel === 'high' ? 'bg-red-100 text-red-800' : patient.riskLevel === 'medium' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}
                          >
                            {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Not analyzed</span>
                        )}
                      </div>
                    </div>
                    
                    {patient.lastAnalyzed && (
                      <div>
                        <strong className="text-sm">Last Analyzed:</strong>
                        <p className="text-sm text-gray-600">
                          {format(new Date(patient.lastAnalyzed), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    
                    {patient.analysisReasoning && (
                      <div>
                        <strong className="text-sm">AI Reasoning:</strong>
                        <p className="text-sm text-gray-600 mt-1">{patient.analysisReasoning}</p>
                      </div>
                    )}
                    
                    {patient.analysisRecommendations && patient.analysisRecommendations.length > 0 && (
                      <div>
                        <strong className="text-sm">Recommendations:</strong>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          {patient.analysisRecommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-purple-600 mt-1">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={analyzePatientStatus}
                    disabled={isAnalyzing}
                    className="w-full"
                    variant="outline"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Status & Risk'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Care Notes</h2>
                <p className="text-gray-600">Recent visit observations and summaries</p>
              </div>
              <AddNoteDialog 
                patientId={params.id} 
                orgSlug={params.slug} 
                onNoteAdded={fetchPatientData}
              />
            </div>

            <div className="space-y-6">
              {notes.map((note) => (
                <Card key={note._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={note.mood === 'happy' ? 'default' : note.mood === 'anxious' ? 'destructive' : 'secondary'}>
                          <Heart className="h-3 w-3 mr-1" />
                          {note.mood}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {format(new Date(note.createdAt), 'MMM d, yyyy at h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">by {note.authorName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note._id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Original Note</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{note.rawText}</p>
                    </div>
                    
                    {note.aiSummary && (
                      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">AI Summary</span>
                        </div>
                        
                        <div>
                          <strong className="text-sm text-blue-900">Observations:</strong>
                          <p className="text-sm text-blue-800">{note.aiSummary.observations}</p>
                        </div>
                        
                        <div>
                          <strong className="text-sm text-blue-900">Risks:</strong>
                          <p className="text-sm text-blue-800">{note.aiSummary.risks}</p>
                        </div>
                        
                        <div>
                          <strong className="text-sm text-blue-900">Suggested Actions:</strong>
                          <p className="text-sm text-blue-800">{note.aiSummary.actions}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="todos" className="space-y-6">
            <PatientTodos 
              patientId={params.id}
              orgSlug={params.slug}
            />
          </TabsContent>

          <TabsContent value="record" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Record Voice Note</h2>
              <p className="text-gray-600">Capture your visit observations - they'll be automatically transcribed and analyzed</p>
            </div>

            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onUploadComplete={(result) => {
                console.log('Transcription result:', result);
                // Handle transcription result
              }}
              disabled={false}
              orgSlug={params.slug}
            />
          </TabsContent>

          <TabsContent value="brief" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-teal-600" />
                  Quick Brief for Carers
                </CardTitle>
                <CardDescription>
                  AI-generated summary to help carers prepare for their visit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generateQuickBrief} className="w-full">
                  Generate Quick Brief
                </Button>
                
                {quickBrief && (
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <p className="text-sm leading-relaxed">{quickBrief}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          const utterance = new SpeechSynthesisUtterance(quickBrief);
                          speechSynthesis.speak(utterance);
                        }
                      }}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Read Aloud
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="family" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Family Communication
                </CardTitle>
                <CardDescription>
                  Generate friendly updates for family members in their preferred language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generateFamilyUpdate} className="w-full">
                  Generate Family Update
                </Button>
                
                {familyUpdate && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <p className="text-sm leading-relaxed">{familyUpdate}</p>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Translate to Italian
                      </Button>
                      <Button variant="outline" size="sm">
                        Translate to Polish
                      </Button>
                      <Button variant="outline" size="sm">
                        Translate to Spanish
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}