import { NextRequest, NextResponse } from 'next/server';

// Interfaces
export interface ChatRequest {
  message: string;
  conversationId: string;
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  useCase: 'support' | 'sales' | 'education' | 'healthcare';
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  tokensUsed: number;
}

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = Number.parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '10', 10);
  const windowMs = 60000; // 1 minute

  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

async function callGroqAPI(messages: Array<{ role: string; content: string }>): Promise<{ message: string; tokensUsed: number }> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error details:', response.status, errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    message: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

async function callOpenAIAPI(messages: Array<{ role: string; content: string }>): Promise<{ message: string; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    message: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
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

    // Check rate limiting
    const rateLimitKey = getRateLimitKey(req);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { message, conversationId, history, useCase } = body;

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, conversationId' },
        { status: 400 }
      );
    }

    // Build messages array with system prompt
    const systemPrompts = {
      support: 'You are a helpful customer support assistant. Be friendly, professional, and solve problems efficiently.',
      sales: 'You are a knowledgeable sales assistant. Help customers find the right products and answer their questions.',
      education: 'You are an educational tutor. Explain concepts clearly and encourage learning.',
      healthcare: 'You are a healthcare information assistant. Provide helpful information while reminding users to consult healthcare professionals.',
    };

    // Clean history to remove any extra properties like 'id' that Groq doesn't support
    const cleanHistory = history.slice(-10).map(({ role, content }) => ({ role, content }));

    const messages = [
      { role: 'system', content: systemPrompts[useCase] || systemPrompts.support },
      ...cleanHistory,
      { role: 'user', content: message },
    ];

    // Try Groq API first, fallback to OpenAI
    let result: { message: string; tokensUsed: number };
    
    try {
      result = await callGroqAPI(messages);
    } catch (groqError) {
      console.error('Groq API failed, falling back to OpenAI:', groqError);
      try {
        result = await callOpenAIAPI(messages);
      } catch (openaiError) {
        console.error('OpenAI API also failed:', openaiError);
        return NextResponse.json(
          { error: 'LLM service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }

    const response: ChatResponse = {
      message: result.message,
      conversationId,
      tokensUsed: result.tokensUsed,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
