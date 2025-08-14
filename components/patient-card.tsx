import Link from 'next/link';
import { format } from 'date-fns';
import { User, Calendar, FileText, AlertCircle, Heart, Activity, Shield, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PatientCardProps {
  patient: {
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
  };
  orgSlug: string;
}

export function PatientCard({ patient, orgSlug }: PatientCardProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  // Determine patient icon based on conditions or status
  const getPatientIcon = () => {
    if (patient.conditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiac'))) {
      return <Heart className="h-5 w-5 text-red-500" />;
    }
    if (patient.conditions?.some(c => c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('blood'))) {
      return <Activity className="h-5 w-5 text-blue-500" />;
    }
    if (patient.conditions?.some(c => c.toLowerCase().includes('dementia') || c.toLowerCase().includes('alzheimer'))) {
      return <Brain className="h-5 w-5 text-purple-500" />;
    }
    return <User className="h-5 w-5 text-teal-600" />;
  };

  // Determine severity level and color
  const getSeverityInfo = () => {
    const riskLevel = patient.riskLevel;
    const urgentActions = patient.urgentActions || 0;
    
    // If AI has analyzed the patient, prioritize AI risk level
    if (riskLevel) {
      if (riskLevel === 'high') {
        return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
      }
      if (riskLevel === 'medium') {
        return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
      }
      if (riskLevel === 'low') {
        return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
      }
    }
    
    // Fallback to urgent actions count if no AI analysis
    if (urgentActions > 3) {
      return { level: 'High', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
    }
    if (urgentActions > 1) {
      return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    }
    if (urgentActions > 0) {
      return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    }
    
    return { level: 'Not Analyzed', color: 'bg-gray-400', textColor: 'text-gray-700', bgColor: 'bg-gray-50' };
  };

  // Get status badge info
  const getStatusInfo = () => {
    const status = patient.status;
    if (!status) {
      return { label: 'Not Analyzed', variant: 'secondary' as const, icon: <Brain className="h-3 w-3" /> };
    }
    switch (status) {
      case 'critical':
        return { label: 'Critical', variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" /> };
      case 'monitoring':
        return { label: 'Monitoring', variant: 'secondary' as const, icon: <Shield className="h-3 w-3" /> };
      default:
        return { label: 'Stable', variant: 'outline' as const, icon: <Heart className="h-3 w-3" /> };
    }
  };

  const severityInfo = getSeverityInfo();
  const statusInfo = getStatusInfo();

  return (
    <Link href={`/org/${orgSlug}/patients/${patient.id}`}>
      <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPatientIcon()}
              <span>{patient.firstName} {patient.lastName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
              {patient.urgentActions && patient.urgentActions > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {patient.urgentActions}
                </Badge>
              )}
            </div>
          </CardTitle>
          
          {/* Severity Meter */}
          <div className={`mt-2 p-2 rounded-lg ${severityInfo.bgColor}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${severityInfo.textColor}`}>Risk Level</span>
              <span className={`text-xs font-bold ${severityInfo.textColor}`}>{severityInfo.level}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${severityInfo.color} transition-all duration-300`}
                style={{ 
                  width: severityInfo.level === 'High' ? '100%' : 
                         severityInfo.level === 'Medium' ? '60%' : 
                         severityInfo.level === 'Low' ? '30%' : '0%'
                }}
              ></div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Age {age} • Born {format(new Date(patient.dob), 'MMM d, yyyy')}</span>
          </div>
          
          {patient.lastVisit && (
            <div className="text-sm text-muted-foreground">
              Last visit: {format(new Date(patient.lastVisit), 'MMM d, yyyy')}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{patient.recentNotes || 0} recent notes</span>
            </div>
          </div>
          
          {patient.carePlan && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {patient.carePlan}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}