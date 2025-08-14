import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  try {
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    
    const transcript = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });
    
    return transcript.text;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export async function generateSummary(text: string, carePlan?: string): Promise<{
  observations: string;
  risks: string;
  actions: string;
  mood: 'happy' | 'sad' | 'anxious' | 'neutral';
}> {
  try {
    const prompt = `
Analyze this care visit note and provide structured insights:

${carePlan ? `Care Plan Context: ${carePlan}` : ''}

Visit Note: "${text}"

Please provide:
1. Key observations (2-3 sentences)
2. Potential risks or concerns (1-2 sentences, or "None identified")
3. Suggested actions (1-3 actionable items)
4. Overall mood assessment (happy/sad/anxious/neutral)

Format as JSON with keys: observations, risks, actions, mood
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content;
    if (!result) throw new Error('No response from AI');

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedResult);
    
    // Ensure actions is a string (convert array to string if needed)
    if (Array.isArray(parsed.actions)) {
      parsed.actions = parsed.actions.join('; ');
    }
    
    return parsed;
  } catch (error) {
    console.error('Summary generation failed:', error);
    
    // Fallback basic analysis
    return {
      observations: 'Care visit completed successfully.',
      risks: 'None identified',
      actions: 'Continue with current care plan',
      mood: 'neutral'
    };
  }
}

export async function generateCareActions(
  patientData: {
    firstName: string;
    lastName: string;
    dob: string;
    carePlan?: string;
    conditions: string[];
    allergies?: string;
    recentNotes?: string[];
    currentActions?: string[];
  }
): Promise<string[]> {
  try {
    const age = new Date().getFullYear() - new Date(patientData.dob).getFullYear();
    const recentNotesText = patientData.recentNotes?.join('\n') || 'No recent notes available';
    const currentActionsText = patientData.currentActions?.join('\n') || 'No current actions';
    
    const prompt = `
Generate personalized care actions for a patient based on their comprehensive profile:

Patient: ${patientData.firstName} ${patientData.lastName}
Age: ${age}
Medical Conditions: ${patientData.conditions.join(', ')}
Allergies: ${patientData.allergies || 'None listed'}
Care Plan: ${patientData.carePlan || 'No specific care plan'}

Recent Care Notes:
${recentNotesText}

Current Active Actions:
${currentActionsText}

Please generate 3-5 specific, actionable care tasks that:
1. Are tailored to this patient's specific conditions and age
2. Consider their recent care notes and current status
3. Avoid duplicating existing active actions
4. Are practical and achievable for care staff
5. Focus on prevention, monitoring, and wellbeing
6. Use clear, professional language

Return only the care actions as a JSON array of strings, no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const result = completion.choices[0].message.content;
    if (!result) throw new Error('No response from AI');

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    const actions = JSON.parse(cleanedResult);
    return Array.isArray(actions) ? actions : [];
  } catch (error) {
    console.error('Care actions generation failed:', error);
    
    // Fallback to basic condition-based actions
    const fallbackActions = [];
    if (patientData.conditions.includes('diabetes')) {
      fallbackActions.push('Monitor blood glucose levels', 'Check medication adherence');
    }
    if (patientData.conditions.includes('high blood pressure')) {
      fallbackActions.push('Check blood pressure readings', 'Review medication compliance');
    }
    if (patientData.conditions.includes('stroke recovery')) {
      fallbackActions.push('Assess mobility and balance', 'Monitor speech and communication');
    }
    
    return fallbackActions.length > 0 ? fallbackActions : ['General wellness check', 'Review current care plan'];
  }
}

export async function analyzePatientStatus(
  patientData: {
    firstName: string;
    lastName: string;
    dob: string;
    conditions: string[];
    allergies?: string;
    carePlan?: string;
    recentNotes?: string[];
    currentActions?: { text: string; status: string }[];
    keyInfo?: {
      emergencyContact?: string;
      gp?: string;
    };
  }
): Promise<{
  status: 'stable' | 'monitoring' | 'critical';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  recommendations: string[];
}> {
  try {
    const age = new Date().getFullYear() - new Date(patientData.dob).getFullYear();
    const recentNotesText = patientData.recentNotes?.join('\n') || 'No recent notes available';
    const pendingActions = patientData.currentActions?.filter(action => action.status === 'pending') || [];
    const completedActions = patientData.currentActions?.filter(action => action.status === 'done') || [];
    
    const prompt = `
Analyze this patient's current health status and risk level based on comprehensive data:

Patient: ${patientData.firstName} ${patientData.lastName}
Age: ${age}
Medical Conditions: ${patientData.conditions.join(', ')}
Allergies: ${patientData.allergies || 'None listed'}
Care Plan: ${patientData.carePlan || 'No specific care plan'}

Recent Care Notes:
${recentNotesText}

Pending Actions (${pendingActions.length}):
${pendingActions.map(action => action.text).join('\n') || 'None'}

Completed Actions (${completedActions.length}):
${completedActions.map(action => action.text).join('\n') || 'None'}

Based on this information, determine:

1. **Status** (stable/monitoring/critical):
   - stable: Patient is doing well, routine care sufficient
   - monitoring: Some concerns requiring closer attention
   - critical: Immediate attention or intervention needed

2. **Risk Level** (low/medium/high):
   - low: Minimal health risks, preventive care focus
   - medium: Some risk factors present, regular monitoring needed
   - high: Significant risk factors, intensive monitoring required

3. **Reasoning**: Brief explanation for the assessment
4. **Recommendations**: 2-3 specific care recommendations

Consider factors like:
- Age-related vulnerabilities
- Severity and combination of conditions
- Recent care observations and trends
- Pending vs completed care actions
- Emergency contacts and support systems

Return as JSON with keys: status, riskLevel, reasoning, recommendations (array)
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content;
    if (!result) throw new Error('No response from AI');

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedResult);
    
    // Validate the response
    const validStatuses = ['stable', 'monitoring', 'critical'];
    const validRiskLevels = ['low', 'medium', 'high'];
    
    if (!validStatuses.includes(parsed.status)) {
      parsed.status = 'stable';
    }
    if (!validRiskLevels.includes(parsed.riskLevel)) {
      parsed.riskLevel = 'low';
    }
    if (!Array.isArray(parsed.recommendations)) {
      parsed.recommendations = ['Continue current care plan'];
    }
    
    return parsed;
  } catch (error) {
    console.error('Patient status analysis failed:', error);
    
    // Fallback analysis based on conditions
    const criticalConditions = ['heart failure', 'stroke', 'dementia', 'cancer'];
    const monitoringConditions = ['diabetes', 'high blood pressure', 'arthritis'];
    
    const hasCritical = patientData.conditions.some(condition => 
      criticalConditions.some(critical => condition.toLowerCase().includes(critical))
    );
    const hasMonitoring = patientData.conditions.some(condition => 
      monitoringConditions.some(monitoring => condition.toLowerCase().includes(monitoring))
    );
    
    let status: 'stable' | 'monitoring' | 'critical' = 'stable';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (hasCritical) {
      status = 'critical';
      riskLevel = 'high';
    } else if (hasMonitoring) {
      status = 'monitoring';
      riskLevel = 'medium';
    }
    
    return {
      status,
      riskLevel,
      reasoning: 'Assessment based on medical conditions due to AI analysis unavailability',
      recommendations: ['Continue current care plan', 'Regular health monitoring']
    };
  }
}

export async function generateFamilyUpdate(
  notes: string[],
  patientName: string,
  language = 'en'
): Promise<string> {
  try {
    const notesText = notes.join('\n\n');
    
    const prompt = `
Create a warm, family-friendly update about ${patientName}'s recent care visits.

Recent care notes:
${notesText}

Requirements:
- Use a caring, positive tone
- Focus on wellbeing and daily activities
- Avoid medical jargon
- Keep it personal but professional
- Length: 2-3 paragraphs

${language !== 'en' ? `Translate the final update to ${language}.` : ''}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    return completion.choices[0].message.content || 'Update could not be generated.';
  } catch (error) {
    console.error('Family update generation failed:', error);
    return `${patientName} has been receiving good care. Recent visits have gone well.`;
  }
}