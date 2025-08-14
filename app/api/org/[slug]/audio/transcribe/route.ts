import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/auth/tenant-guard';
import { transcribeAudio } from '@/lib/ai/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  console.log('🎤 Audio transcription request started', {
    slug: params.slug,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log('🔐 Checking organization context...');
    const { slug, canWrite, userId } = await requireOrgContext(request, params.slug);
    
    console.log('✅ Organization context verified', {
      slug,
      userId,
      canWrite
    });
    
    if (!canWrite) {
      console.log('❌ Insufficient permissions for user', { userId, slug });
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    console.log('📁 Parsing form data...');
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.log('❌ No audio file provided in request');
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    console.log('🎵 Audio file received', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });
    
    // Convert to buffer for OpenAI
    console.log('🔄 Converting audio to buffer...');
    const audioBuffer = await audioFile.arrayBuffer();
    console.log('✅ Audio buffer created', { bufferSize: audioBuffer.byteLength });
    
    // Transcribe audio
    console.log('🤖 Starting transcription with OpenAI...');
    const startTime = Date.now();
    const transcript = await transcribeAudio(audioBuffer);
    const transcriptionTime = Date.now() - startTime;
    
    console.log('✅ Transcription completed', {
      transcriptLength: transcript.length,
      transcriptionTimeMs: transcriptionTime,
      preview: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : '')
    });
    
    // TODO: Track usage in usage_meters collection
    const durationSeconds = Math.ceil(audioFile.size / 16000); // Rough estimate
    
    console.log('📊 Transcription response prepared', {
      estimatedDurationSeconds: durationSeconds,
      transcriptLength: transcript.length
    });
    
    return NextResponse.json({
      transcript,
      durationSeconds
    });
    
  } catch (error: any) {
    console.error('❌ Audio transcription error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      slug: params.slug,
      timestamp: new Date().toISOString()
    });
    
    // Log additional context if available
    if (error.response) {
      console.error('🔍 Error response details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}