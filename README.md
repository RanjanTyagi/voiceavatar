# AI Avatar System

A cost-optimized conversational interface that combines visual avatar representation with natural language processing to create engaging user interactions.

## Overview

The AI Avatar System is a browser-based application built with Next.js 16, TypeScript, and deployed on Vercel's free tier. It leverages browser APIs (Web Speech API), free-tier LLM services (Groq), and serverless functions to minimize operational costs while maintaining responsive performance.

## Features

- **Visual Avatar Representation**: 2D/3D avatar with expressions (neutral, happy, thinking, speaking, listening)
- **Natural Language Conversation**: LLM-powered conversations with context management
- **Speech Input/Output**: Browser-based speech recognition and synthesis
- **Multi-Use Case Support**: Configurable for customer support, sales, education, and healthcare
- **Cost Optimization**: Free-tier services, client-side caching, and usage monitoring
- **Accessibility**: Keyboard navigation, ARIA labels, text-only mode

## Tech Stack

- **Framework**: Next.js 16.2.1 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Testing**: Jest + fast-check (property-based testing)
- **Deployment**: Vercel (serverless functions)
- **LLM Services**: Groq API (primary), OpenAI API (fallback)
- **Speech APIs**: Web Speech API (browser-native)

## Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── api/               # Serverless API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── services/              # Business logic and API integrations
├── .env.local            # Environment variables (local)
├── .env.example          # Environment variables template
├── jest.config.ts        # Jest configuration
├── jest.setup.ts         # Jest setup file
├── vercel.json           # Vercel deployment configuration
└── package.json          # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and configure your API keys:

```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
   - `GROQ_API_KEY`: Your Groq API key
   - `OPENAI_API_KEY`: Your OpenAI API key (optional, for fallback)

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing

Run tests:

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Building

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Deployment

### Vercel Deployment

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy:

```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`
   - `MAX_MESSAGES_PER_MINUTE`
   - `MAX_TOKENS_PER_DAY`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq API key for LLM service | Yes |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | No |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |
| `MAX_MESSAGES_PER_MINUTE` | Rate limit for messages | No (default: 10) |
| `MAX_TOKENS_PER_DAY` | Daily token usage cap | No (default: 10000) |
| `ENABLE_FALLBACK_TTS` | Enable OpenAI TTS fallback | No (default: false) |

## Architecture

The system follows a client-heavy architecture where most processing occurs in the browser, with serverless functions acting as secure API proxies. This design minimizes server costs while maintaining security for API credentials.

### Key Components

- **Avatar Renderer**: Displays and animates the visual avatar
- **Conversation Manager**: Orchestrates LLM interactions and maintains context
- **Speech Input Handler**: Captures and converts user speech to text
- **Speech Output Handler**: Converts AI responses to speech
- **Expression Controller**: Manages avatar facial expressions
- **API Proxy**: Serverless functions for secure API access

## Testing Strategy

The project uses a dual testing approach:

- **Unit Tests**: Verify specific examples, edge cases, and integration points
- **Property-Based Tests**: Verify universal properties across all inputs using fast-check (100+ iterations)

## Cost Optimization

- Browser-native Web Speech API (free)
- Groq API free tier (primary LLM)
- Client-side caching to reduce API calls
- Usage tracking and rate limiting
- Vercel free tier deployment

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
