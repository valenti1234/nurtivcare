'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface PatientPhotoUploadProps {
  patientId: string;
  orgSlug: string;
  currentPhoto?: {
    url: string;
    filename: string;
    uploadedAt: string;
    verified?: boolean;
  };
  onPhotoUpdate?: () => void;
}

export function PatientPhotoUpload({ 
  patientId, 
  orgSlug, 
  currentPhoto, 
  onPhotoUpdate 
}: PatientPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Ensure video stream is set when camera opens
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      console.log('Setting video stream in useEffect');
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      setIsCameraOpen(true);
      
      // Immediately set video source
      if (videoRef.current) {
        console.log('Setting video srcObject immediately');
        videoRef.current.srcObject = stream;
        // Force video to load
        videoRef.current.load();
        
        // Fallback: set video ready after a delay if event doesn't fire
        setTimeout(() => {
          if (!isVideoReady && videoRef.current) {
            console.log('Fallback: setting video ready manually');
            setIsVideoReady(true);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
    setIsVideoReady(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      // Ensure video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: 'Camera Error',
          description: 'Camera not ready. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Captured image data URL length:', imageDataUrl.length);
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const uploadPhoto = async (file: File | string) => {
    setIsUploading(true);
    try {
      let formData = new FormData();
      
      if (typeof file === 'string') {
        // Convert data URL to blob
        const response = await fetch(file);
        const blob = await response.blob();
        formData.append('photo', blob, `patient-${patientId}-photo.jpg`);
      } else {
        formData.append('photo', file);
      }
      
      formData.append('patientId', patientId);
      
      const uploadResponse = await fetch(`/api/org/${orgSlug}/patients/${patientId}/photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        toast({
          title: 'Photo Uploaded',
          description: 'Patient photo has been uploaded successfully.',
        });
        stopCamera();
        onPhotoUpdate?.();
      } else {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload photo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        uploadPhoto(file);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
      }
    }
  };

  const verifyPhoto = async () => {
    try {
      const response = await fetch(`/api/org/${orgSlug}/patients/${patientId}/photo/verify`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: 'Photo Verified',
          description: 'Patient photo has been marked as verified.',
        });
        onPhotoUpdate?.();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying photo:', error);
      toast({
        title: 'Verification Error',
        description: error instanceof Error ? error.message : 'Failed to verify photo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Patient Photo</span>
          {currentPhoto?.verified && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Photo Display */}
        {currentPhoto && (
          <div className="space-y-2">
            <div className="relative w-full max-w-sm mx-auto">
              <Image
                src={currentPhoto.url}
                alt="Patient photo"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full h-64"
              />
              {!currentPhoto.verified && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Uploaded: {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
            </p>
            {!currentPhoto.verified && (
              <div className="flex justify-center">
                <Button onClick={verifyPhoto} size="sm" variant="outline">
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Verified
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Camera Interface */}
        {isCameraOpen && (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                  setIsVideoReady(true);
                }}
                onCanPlay={() => console.log('Video can play')}
                onPlaying={() => console.log('Video is playing')}
                onError={(e) => console.error('Video error:', e)}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                Video: {isVideoReady ? 'Ready' : 'Loading...'}
              </div>
              {capturedImage && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                  Image Captured
                </div>
              )}
            </div>
            
            {capturedImage && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-2">Preview:</div>
                <img
                  src={capturedImage}
                  alt="Captured photo"
                  className="w-full rounded-lg object-cover h-64"
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => console.error('Image load error:', e)}
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => uploadPhoto(capturedImage)}
                    disabled={isUploading}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <Button
                    onClick={() => setCapturedImage(null)}
                    variant="outline"
                    size="sm"
                  >
                    Retake
                  </Button>
                </div>
              </div>
            )}
            
            {!capturedImage && (
              <div className="space-y-2">
                <div className="text-center text-sm text-gray-600">
                  Debug: Video Ready: {isVideoReady ? 'Yes' : 'No'} | Captured: {capturedImage ? 'Yes' : 'No'}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={capturePhoto} 
                    size="sm"
                    disabled={!isVideoReady}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Options */}
        {!isCameraOpen && (
          <div className="flex gap-2 justify-center">
            <Button onClick={startCamera} variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-gray-500 text-center">
          Upload a clear photo for ID verification. Photos help carers confirm they're visiting the correct patient.
        </p>
      </CardContent>
    </Card>
  );
}