'use client';

import { useState, useEffect } from 'react';
import { MapPin, Save, Edit, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PatientLocationProps {
  patientId: string;
  orgSlug: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    radius?: number;
  };
  onLocationUpdate?: () => void;
}

export function PatientLocation({ 
  patientId, 
  orgSlug, 
  currentLocation, 
  onLocationUpdate 
}: PatientLocationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    address: currentLocation?.address || '',
    latitude: currentLocation?.latitude || 0,
    longitude: currentLocation?.longitude || 0,
    radius: currentLocation?.radius || 100
  });
  const { toast } = useToast();

  useEffect(() => {
    if (currentLocation) {
      setFormData({
        address: currentLocation.address || '',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: currentLocation.radius || 100
      });
    }
  }, [currentLocation]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation Error',
        description: 'Geolocation is not supported by this browser.',
        variant: 'destructive',
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}`
          );
          
          let address = '';
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              address = data.results[0].formatted;
            }
          }
          
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
          
          toast({
            title: 'Location Retrieved',
            description: 'Current location has been retrieved successfully.',
          });
        } catch (error) {
          console.error('Error getting address:', error);
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: 'Location Error',
          description: 'Unable to retrieve current location. Please check permissions.',
          variant: 'destructive',
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          return {
            latitude: result.geometry.lat,
            longitude: result.geometry.lng,
            formatted: result.formatted
          };
        }
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
    return null;
  };

  const handleAddressChange = async (address: string) => {
    setFormData(prev => ({ ...prev, address }));
    
    // Auto-geocode if address looks complete
    if (address.length > 10 && address.includes(',')) {
      const coords = await geocodeAddress(address);
      if (coords) {
        setFormData(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: coords.formatted
        }));
      }
    }
  };

  const saveLocation = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients/${patientId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address,
          radius: formData.radius
        }),
      });
      
      if (response.ok) {
        toast({
          title: 'Location Saved',
          description: 'Patient location has been updated successfully.',
        });
        setIsEditing(false);
        onLocationUpdate?.();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Save Error',
        description: error instanceof Error ? error.message : 'Failed to save location.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasLocation = currentLocation && currentLocation.latitude && currentLocation.longitude;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span>Patient Location</span>
          </div>
          {hasLocation && (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              Location Set
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing && hasLocation ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Address</Label>
              <p className="text-sm text-gray-700 mt-1">{currentLocation.address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Coordinates</Label>
                <p className="text-sm text-gray-700 mt-1">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Match Radius</Label>
                <p className="text-sm text-gray-700 mt-1">{currentLocation.radius}m</p>
              </div>
            </div>
            
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Enter patient's address"
                  className="flex-1"
                />
                <Button
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  variant="outline"
                  size="sm"
                >
                  <Navigation className="h-4 w-4" />
                  {isGettingLocation ? 'Getting...' : 'Current'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.000000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="radius">Match Radius (meters)</Label>
              <Input
                id="radius"
                type="number"
                value={formData.radius}
                onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 100 }))}
                placeholder="100"
              />
              <p className="text-xs text-gray-500">
                Carers must be within this distance to check in for this patient
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={saveLocation}
                disabled={isSaving || !formData.address || !formData.latitude || !formData.longitude}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Location'}
              </Button>
              {isEditing && (
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    if (currentLocation) {
                      setFormData({
                        address: currentLocation.address || '',
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        radius: currentLocation.radius || 100
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
        
        {!hasLocation && !isEditing && (
          <div className="text-center py-6">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No location set for this patient</p>
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Set Location
            </Button>
          </div>
        )}
        
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Location Matching:</strong> When carers check in for shifts, their location will be compared 
            with this patient's location to ensure they're at the correct address.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}