import { NextRequest, NextResponse } from 'next/server';

// Interfaces
export interface TTSRequest {
  text: string;
  voice?: string;
}

export interface TTSResponse {
  audioUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    // Validate request origin
    const origin = req.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'http://localhost:3000',
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: TTSRequest = await req.json();
    const { text, voice = 'alloy' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TTS service not configured' },
        { status: 503 }
      );
    }

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI TTS API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'TTS service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get audio data as blob
    const audioBlob = await response.blob();
    
    // Convert blob to base64 data URL
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    const ttsResponse: TTSResponse = {
      audioUrl,
    };

    return NextResponse.json(ttsResponse);

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
