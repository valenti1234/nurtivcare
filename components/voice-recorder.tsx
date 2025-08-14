'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onUploadComplete?: (result: any) => void;
  disabled?: boolean;
  orgSlug: string;
}

export function VoiceRecorder({ 
  onRecordingComplete, 
  onUploadComplete, 
  disabled,
  orgSlug 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        onRecordingComplete(blob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Record in 1s chunks
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob) {
      console.warn('🚫 Upload attempted but no audio blob available');
      return;
    }
    
    console.log('🚀 Starting audio upload', {
      orgSlug,
      audioBlobSize: audioBlob.size,
      audioBlobType: audioBlob.type,
      timestamp: new Date().toISOString()
    });
    
    setIsUploading(true);
    
    try {
      console.log('📦 Creating form data...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const uploadUrl = `/api/org/${orgSlug}/audio/transcribe`;
      console.log('📡 Sending request to:', uploadUrl);
      
      const startTime = Date.now();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const uploadTime = Date.now() - startTime;
      
      console.log('📥 Response received', {
        status: response.status,
        statusText: response.statusText,
        uploadTimeMs: uploadTime,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed with response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('🔄 Parsing response JSON...');
      const result = await response.json();
      
      console.log('✅ Upload and transcription successful', {
        transcriptLength: result.transcript?.length || 0,
        durationSeconds: result.durationSeconds,
        preview: result.transcript?.substring(0, 50) + (result.transcript?.length > 50 ? '...' : '')
      });
      
      onUploadComplete?.(result);
      
    } catch (error) {
      console.error('❌ Upload error occurred:', {
        error: error instanceof Error ? error.message : String(error),
        orgSlug,
        audioBlobSize: audioBlob.size,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsUploading(false);
      console.log('🏁 Upload process completed');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg border">
      <div className="flex items-center gap-4">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isUploading}
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 transition-all duration-200",
            isRecording 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        
        {audioBlob && !isRecording && (
          <Button
            onClick={uploadRecording}
            disabled={isUploading}
            variant="outline"
            className="rounded-full w-12 h-12"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
      
      {isRecording && (
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-red-500">
            {formatDuration(recordingDuration)}
          </div>
          <p className="text-sm text-muted-foreground">Recording...</p>
        </div>
      )}
      
      {audioBlob && !isRecording && !isUploading && (
        <p className="text-sm text-muted-foreground">
          Recording ready - click upload to transcribe
        </p>
      )}
      
      {isUploading && (
        <p className="text-sm text-muted-foreground">
          Transcribing audio...
        </p>
      )}
    </div>
  );
}