'use client';

import { useState, useEffect } from 'react';
import { MapPin, User, Clock, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  radius?: number;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  location?: Location;
  carePlan: string;
  keyInfo: {
    conditions: string[];
    emergencyContact: string;
  };
  distance?: number;
}

interface NearbyPatientsProps {
  orgSlug: string;
  carerLocation?: {
    latitude: number;
    longitude: number;
  };
  maxDistance?: number; // in meters
  onPatientSelect?: (patient: Patient) => void;
}

export function NearbyPatients({ 
  orgSlug, 
  carerLocation, 
  maxDistance = 5000, // 5km default
  onPatientSelect
}: NearbyPatientsProps) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (carerLocation) {
      fetchNearbyPatients();
    } else {
      setIsLoading(false);
    }
  }, [carerLocation, orgSlug]);

  const fetchNearbyPatients = async () => {
    if (!carerLocation) return;

    try {
      const response = await fetch(
        `/api/org/${orgSlug}/patients?` + 
        `lat=${carerLocation.latitude}&` +
        `lng=${carerLocation.longitude}&` +
        `maxDistance=${maxDistance}`
      );

      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        console.error('Failed to fetch nearby patients');
      }
    } catch (error) {
      console.error('Error fetching nearby patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

    return R * c; // Distance in meters
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const getDirections = (patient: Patient) => {
    if (!carerLocation || !patient.location) return;
    
    const url = `https://www.google.com/maps/dir/${carerLocation.latitude},${carerLocation.longitude}/${patient.location.latitude},${patient.location.longitude}`;
    window.open(url, '_blank');
  };

  if (!carerLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Nearby Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Location access required to show nearby patients.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Nearby Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Loading nearby patients...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Nearby Patients
          <Badge variant="secondary">{patients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-sm text-gray-600">
            No patients found within {formatDistance(maxDistance)} of your location.
          </p>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => {
              const distance = patient.location && carerLocation 
                ? calculateDistance(
                    carerLocation.latitude,
                    carerLocation.longitude,
                    patient.location.latitude,
                    patient.location.longitude
                  )
                : null;

              return (
                <div key={patient._id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </span>
                    </div>
                    {distance && (
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {formatDistance(distance)}
                      </Badge>
                    )}
                  </div>
                  
                  {patient.location?.address && (
                    <p className="text-xs text-gray-600">
                      📍 {patient.location.address}
                    </p>
                  )}
                  
                  {patient.keyInfo.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {patient.keyInfo.conditions.slice(0, 2).map((condition, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                      {patient.keyInfo.conditions.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{patient.keyInfo.conditions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/org/${orgSlug}/patients/${patient._id}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        View Details
                      </Button>
                    </Link>
                    {patient.location && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => getDirections(patient)}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Directions
                      </Button>
                    )}
                    {onPatientSelect && patient.location && (
                      <Button 
                        size="sm" 
                        className="text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => onPatientSelect(patient)}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Start Pre-Check-in
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}