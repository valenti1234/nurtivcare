'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, LogIn, LogOut, Timer, User, Navigation, Target, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { NearbyPatients } from './nearby-patients';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface PreCheckinData {
  destination: Patient;
  notes: string;
  estimatedArrival?: Date;
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

interface ShiftTrackerProps {
  orgSlug: string;
}

export function ShiftTracker({ orgSlug }: ShiftTrackerProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Pre-checkin states
  const [preCheckinData, setPreCheckinData] = useState<PreCheckinData | null>(null);
  const [nearbyPatients, setNearbyPatients] = useState<Patient[]>([]);
  const [isAtDestination, setIsAtDestination] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch active shift on component mount
  useEffect(() => {
    fetchActiveShift();
  }, [orgSlug]);

  // Get user's location and track position
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLocation);
          
          // Check distance to destination if in pre-checkin mode
          if (preCheckinData?.destination?.location) {
            const distance = calculateDistance(
              newLocation.latitude,
              newLocation.longitude,
              preCheckinData.destination.location.latitude,
              preCheckinData.destination.location.longitude
            );
            setDistanceToDestination(distance);
            setIsAtDestination(distance <= 100); // Within 100 meters
          }
        },
        (error) => {
          console.warn('Location access denied:', error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [preCheckinData]);
  
  // Fetch nearby patients
  useEffect(() => {
    if (location && !activeShift && !preCheckinData) {
      fetchNearbyPatients();
    }
  }, [location, activeShift, preCheckinData, orgSlug]);
  
  // Calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  const fetchNearbyPatients = async () => {
    if (!location) return;
    
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients?nearby=true&lat=${location.latitude}&lng=${location.longitude}&radius=5000`);
      if (response.ok) {
        const data = await response.json();
        setNearbyPatients(data.patients || []);
      }
    } catch (error) {
       console.error('Error fetching nearby patients:', error);
     }
   };

  const fetchActiveShift = async () => {
    try {
      const response = await fetch(`/api/org/${orgSlug}/shifts?status=active&userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveShift(data.shifts[0] || null);
      }
    } catch (error) {
      console.error('Error fetching active shift:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreCheckin = async (patient: Patient) => {
    setPreCheckinData({
      destination: patient,
      notes: checkInNotes,
      estimatedArrival: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    });
    
    toast({
      title: 'Pre-Check-in Started',
      description: `Navigating to ${patient.firstName} ${patient.lastName}`,
    });
  };
  
  const cancelPreCheckin = () => {
    setPreCheckinData(null);
    setIsAtDestination(false);
    setDistanceToDestination(null);
  };
  
  const getDirections = (patient: Patient) => {
    if (patient.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${patient.location.latitude},${patient.location.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    try {
      const checkInData = {
        userId: session?.user?.id,
        location,
        notes: preCheckinData ? preCheckinData.notes : checkInNotes,
        patientId: preCheckinData?.destination?._id,
      };
      
      const response = await fetch(`/api/org/${orgSlug}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkInData)
      });

      if (response.ok) {
        const data = await response.json();
        setActiveShift(data.shift);
        setCheckInNotes('');
        setPreCheckinData(null);
        setIsAtDestination(false);
        setDistanceToDestination(null);
        toast({
          title: 'Checked In Successfully',
          description: preCheckinData 
            ? `Checked in at ${preCheckinData.destination.firstName} ${preCheckinData.destination.lastName}'s location`
            : `Your shift started at ${format(new Date(), 'HH:mm')}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Check-in Failed',
          description: error.error || 'Failed to check in',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Error',
        description: 'Failed to check in',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeShift) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/org/${orgSlug}/shifts/${activeShift._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkout',
          notes: checkOutNotes,
          location
        })
      });

      if (response.ok) {
        const data = await response.json();
        setActiveShift(null);
        setCheckOutNotes('');
        setIsCheckOutDialogOpen(false);
        
        const duration = data.shift.duration;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        
        toast({
          title: 'Checked Out Successfully',
          description: `Shift completed. Duration: ${hours}h ${minutes}m`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Check-out Failed',
          description: error.error || 'Failed to check out',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast({
        title: 'Error',
        description: 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShiftDuration = () => {
    if (!activeShift) return null;
    
    const startTime = new Date(activeShift.checkInTime);
    const duration = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }
  
  // Pre-checkin interface
  if (preCheckinData && !activeShift) {
    const { destination } = preCheckinData;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Pre-Check-in Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">
              Destination: {destination.firstName} {destination.lastName}
            </h3>
            <p className="text-sm text-blue-700">
              {destination.location?.address}
            </p>
          </div>
          
          {distanceToDestination !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              <span>
                Distance: {distanceToDestination < 1000 
                  ? `${Math.round(distanceToDestination)}m` 
                  : `${(distanceToDestination / 1000).toFixed(1)}km`}
              </span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => getDirections(destination)}
              variant="outline"
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
            
            <Button 
              onClick={cancelPreCheckin}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
          
          {isAtDestination && (
            <Button 
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Checking In...' : 'Check In - Arrived!'}
            </Button>
          )}
          
          {!isAtDestination && distanceToDestination !== null && distanceToDestination > 100 && (
            <div className="text-center text-sm text-gray-600">
              Get closer to the destination to check in
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        {activeShift ? (
          // Active shift display
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Timer className="h-3 w-3 mr-1" />
                Active Shift
              </Badge>
              <div className="text-sm text-gray-600">
                {format(currentTime, 'HH:mm:ss')}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Check-in Time</p>
                <p className="text-lg font-semibold">
                  {format(new Date(activeShift.checkInTime), 'HH:mm')}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(activeShift.checkInTime), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Duration</p>
                <p className="text-lg font-semibold text-blue-600">
                  {getShiftDuration()}
                </p>
              </div>
            </div>

            {activeShift.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Location tracked</span>
              </div>
            )}

            {activeShift.notes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Check-in Notes</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {activeShift.notes}
                </p>
              </div>
            )}

            <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Check Out of Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Shift Duration: {getShiftDuration()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Check-out Notes (Optional)
                    </label>
                    <Textarea
                      placeholder="Add any notes about your shift..."
                      value={checkOutNotes}
                      onChange={(e) => setCheckOutNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCheckOutDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCheckOut}
                      disabled={isSubmitting}
                      variant="destructive"
                    >
                      {isSubmitting ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // Check-in form
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Ready to start your shift?</p>
              <p className="text-2xl font-bold">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-sm text-gray-500">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {location && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <MapPin className="h-4 w-4" />
                <span>Location detected</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Check-in Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any notes for the start of your shift..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleCheckIn}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        )}
        </CardContent>
      </Card>
      
      {!activeShift && !preCheckinData && location && (
        <NearbyPatients 
          orgSlug={orgSlug} 
          carerLocation={location}
          onPatientSelect={handlePreCheckin}
        />
      )}
      
      {activeShift && (
         <NearbyPatients 
           orgSlug={orgSlug} 
           carerLocation={location || undefined}
         />
       )}
    </div>
  );
}