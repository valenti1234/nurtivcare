import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/auth/tenant-guard';
import { transcribeAudio } from '@/lib/ai/openai';

export async function POST(request: NextRequest) {
  try {
    const { orgId, canWrite, userId } = await requireOrgContext(request);
    
    if (!canWrite) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Convert to buffer for OpenAI
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Transcribe audio
    const transcript = await transcribeAudio(audioBuffer);
    
    // TODO: Track usage in usage_meters collection
    const durationSeconds = Math.ceil(audioFile.size / 16000); // Rough estimate
    
    return NextResponse.json({
      transcript,
      durationSeconds
    });
    
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}