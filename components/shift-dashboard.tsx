'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Users, Calendar, Filter, Download, MapPin, Timer, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Shift {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  orgId: string;
  checkInTime: string;
  checkOutTime?: string;
  location?: Location;
  notes?: string;
  status: 'active' | 'completed';
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

interface ShiftStats {
  totalShifts: number;
  activeShifts: number;
  totalHours: number;
  averageShiftLength: number;
}

interface ShiftDashboardProps {
  orgSlug: string;
}

export function ShiftDashboard({ orgSlug }: ShiftDashboardProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    userId: 'all',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchShifts();
  }, [orgSlug, filters, pagination.page]);

  useEffect(() => {
    calculateStats();
  }, [shifts]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/org/${orgSlug}/shifts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setShifts(data.shifts);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch shifts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch shifts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    if (shifts.length === 0) {
      setStats(null);
      return;
    }

    const totalShifts = shifts.length;
    const activeShifts = shifts.filter(shift => shift.status === 'active').length;
    const completedShifts = shifts.filter(shift => shift.status === 'completed' && shift.duration);
    const totalMinutes = completedShifts.reduce((sum, shift) => sum + (shift.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const averageShiftLength = completedShifts.length > 0 
      ? Math.round((totalMinutes / completedShifts.length) / 60 * 10) / 10 
      : 0;

    setStats({
      totalShifts,
      activeShifts,
      totalHours,
      averageShiftLength
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getShiftStatus = (shift: Shift) => {
    if (shift.status === 'active') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <Timer className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Completed
      </Badge>
    );
  };

  const exportShifts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.userId !== 'all') params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '1000'); // Get more records for export

      const response = await fetch(`/api/org/${orgSlug}/shifts?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        // Create CSV content
        const headers = ['Name', 'Email', 'Check In', 'Check Out', 'Duration', 'Status', 'Notes'];
        const csvContent = [
          headers.join(','),
          ...data.shifts.map((shift: Shift) => [
            `"${shift.userId.name}"`,
            `"${shift.userId.email}"`,
            `"${format(new Date(shift.checkInTime), 'yyyy-MM-dd HH:mm:ss')}"`,
            shift.checkOutTime ? `"${format(new Date(shift.checkOutTime), 'yyyy-MM-dd HH:mm:ss')}"` : '""',
            shift.duration ? `"${formatDuration(shift.duration)}"` : '""',
            `"${shift.status}"`,
            `"${shift.notes || ''}"`
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shifts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Export Successful',
          description: 'Shifts data has been exported to CSV',
        });
      }
    } catch (error) {
      console.error('Error exporting shifts:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export shifts data',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold">{stats.totalShifts}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Shifts</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeShifts}</p>
                </div>
                <Timer className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold">{stats.totalHours}h</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Shift</p>
                  <p className="text-2xl font-bold">{stats.averageShiftLength}h</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Management
            </CardTitle>
            <Button onClick={exportShifts} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              placeholder="Start date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            
            <Input
              type="date"
              placeholder="End date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
            
            <Button 
              onClick={() => setFilters({ status: 'all', userId: 'all', startDate: '', endDate: '' })}
              variant="outline"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Shifts List */}
          {isLoading ? (
            <div className="text-center py-8">Loading shifts...</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <div key={shift._id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{shift.userId.name}</p>
                        <p className="text-sm text-gray-600">{shift.userId.email}</p>
                      </div>
                    </div>
                    {getShiftStatus(shift)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Check In</p>
                      <p className="font-medium">
                        {format(new Date(shift.checkInTime), 'MMM d, HH:mm')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Check Out</p>
                      <p className="font-medium">
                        {shift.checkOutTime 
                          ? format(new Date(shift.checkOutTime), 'MMM d, HH:mm')
                          : 'Active'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-medium">
                        {formatDuration(shift.duration)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium flex items-center gap-1">
                        {shift.location ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            Tracked
                          </>
                        ) : (
                          'Not tracked'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {shift.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600">Notes:</p>
                      <p className="text-sm">{shift.notes}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} shifts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}