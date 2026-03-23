import { NextResponse } from 'next/server';

// Interface
export interface HealthResponse {
  status: 'ok' | 'degraded';
  services: {
    groq: boolean;
    openai: boolean;
  };
}

async function checkGroqService(): Promise<boolean> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch (error) {
    console.error('Groq health check failed:', error);
    return false;
  }
}

async function checkOpenAIService(): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Check both services in parallel
    const [groqAvailable, openaiAvailable] = await Promise.all([
      checkGroqService(),
      checkOpenAIService(),
    ]);

    const response: HealthResponse = {
      status: (groqAvailable || openaiAvailable) ? 'ok' : 'degraded',
      services: {
        groq: groqAvailable,
        openai: openaiAvailable,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Health check error:', error);
    
    const response: HealthResponse = {
      status: 'degraded',
      services: {
        groq: false,
        openai: false,
      },
    };

    return NextResponse.json(response, { status: 503 });
  }
}
