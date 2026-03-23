# Services

This directory contains core service modules for the AI Avatar System.

## SpeechInputHandler

The `SpeechInputHandler` service captures and converts user speech to text using the browser's Web Speech API.

### Features

- **Browser Compatibility Detection**: Automatically detects if speech recognition is supported
- **Web Speech API Integration**: Uses native browser SpeechRecognition API
- **Visual Feedback Support**: Provides listening state callbacks for UI updates
- **Error Handling**: Graceful fallback to text-only mode when speech is unavailable
- **Cross-browser Support**: Supports both standard and webkit-prefixed APIs

### Usage

```typescript
import { DefaultSpeechInputHandler } from '@/services';

// Create handler instance
const speechHandler = new DefaultSpeechInputHandler();

// Check browser support
if (speechHandler.isSupported()) {
  // Set up callbacks
  speechHandler.onSpeechDetected((text) => {
    console.log('User said:', text);
  });

  speechHandler.onListeningStateChange((isListening) => {
    console.log('Listening:', isListening);
  });

  speechHandler.onError((error) => {
    console.error('Speech error:', error.message);
  });

  // Start listening
  speechHandler.startListening();
} else {
  console.log('Speech recognition not supported - use text input');
}
```

### API

#### Methods

- `isSupported()`: Returns `true` if speech recognition is available
- `startListening()`: Begins capturing audio input
- `stopListening()`: Stops capturing audio input
- `isListening()`: Returns current listening state
- `onSpeechDetected(callback)`: Register callback for speech-to-text results
- `onError(callback)`: Register callback for error handling
- `onListeningStateChange(callback)`: Register callback for listening state changes

#### Error Codes

- `not-supported`: Speech recognition not available in browser
- `no-speech`: No speech detected
- `audio-capture`: Microphone not found or access denied
- `not-allowed`: Microphone permission denied
- `network`: Network error occurred
- `start-failed`: Failed to start speech recognition

### Requirements Validated

- **3.1**: Web Speech API integration
- **3.2**: Microphone button starts listening
- **3.3**: Visual feedback for listening state
- **3.5**: Browser compatibility detection and fallback
- **12.2**: Error handling with graceful degradation

## SpeechOutputHandler

The `SpeechOutputHandler` service converts AI responses to speech using the browser's Web Speech API with OpenAI TTS fallback.

### Features

- **Browser Compatibility Detection**: Automatically detects if speech synthesis is supported
- **Web Speech API Integration**: Uses native browser SpeechSynthesis API
- **Playback Controls**: Pause, resume, and stop speech playback
- **Event Handlers**: Callbacks for speech start/end events
- **OpenAI TTS Fallback**: Automatically falls back to OpenAI TTS API when Web Speech fails
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Usage

```typescript
import { DefaultSpeechOutputHandler } from '@/services';

// Create handler instance (with optional fallback enabled)
const speechHandler = new DefaultSpeechOutputHandler(true);

// Check browser support
if (speechHandler.isSupported()) {
  // Set up callbacks
  speechHandler.onSpeechStart(() => {
    console.log('Speech started');
  });

  speechHandler.onSpeechEnd(() => {
    console.log('Speech ended');
  });

  speechHandler.onError((error) => {
    console.error('Speech error:', error.message);
  });

  // Speak text
  await speechHandler.speak('Hello, how can I help you today?');

  // Control playback
  speechHandler.pause();
  speechHandler.resume();
  speechHandler.stop();
} else {
  console.log('Speech synthesis not supported - displaying text only');
}
```

### API

#### Constructor

- `new DefaultSpeechOutputHandler(enableFallback?: boolean)`: Create handler with optional OpenAI TTS fallback

#### Methods

- `isSupported()`: Returns `true` if speech synthesis is available (including fallback)
- `speak(text: string)`: Convert text to speech and play it
- `pause()`: Pause current speech playback
- `resume()`: Resume paused speech playback
- `stop()`: Stop current speech playback
- `isSpeaking()`: Returns current speaking state
- `onSpeechStart(callback)`: Register callback for speech start event
- `onSpeechEnd(callback)`: Register callback for speech end event
- `onError(callback)`: Register callback for error handling

#### Error Codes

- `not-supported`: Speech synthesis not available in browser
- `speech-failed`: Web Speech API failed
- `fallback-failed`: Both Web Speech and OpenAI TTS failed
- `canceled`: Speech was canceled
- `interrupted`: Speech was interrupted
- `audio-busy`: Audio output device is busy
- `audio-hardware`: Audio hardware error
- `network`: Network error during synthesis
- `synthesis-unavailable`: Speech synthesis temporarily unavailable
- `synthesis-failed`: Speech synthesis failed
- `not-allowed`: Speech synthesis not allowed in context

### Requirements Validated

- **4.1**: Web Speech API integration
- **4.2**: Text-to-speech conversion
- **4.4**: Playback controls (pause, resume, stop)
- **4.5**: OpenAI TTS fallback when Web Speech fails
- **12.3**: Error handling with graceful degradation

## ExpressionController

The `ExpressionController` manages avatar facial expressions based on system state.

See `ExpressionController.ts` for implementation details.

## ConversationManager

The `ConversationManager` orchestrates LLM interactions and maintains conversation context with session persistence.

### Features

- **Use Case Configuration**: Support for multiple use cases (support, sales, education, healthcare)
- **Rolling Context Window**: Maintains last 10 message exchanges for efficient API usage
- **Message History**: Stores and retrieves complete conversation history
- **Session Persistence**: Saves/restores sessions to Local Storage with 24-hour expiration
- **API Integration**: Proxies requests to LLM service through serverless functions
- **Error Handling**: Graceful error handling with automatic rollback on failures

### Usage

```typescript
import { DefaultConversationManager } from '@/services';

// Create manager instance
const manager = new DefaultConversationManager();

// Initialize with use case
await manager.initialize('support');

// Send a message
try {
  const response = await manager.sendMessage('Hello, I need help');
  console.log('AI Response:', response.message);
  console.log('Tokens used:', response.tokensUsed);
} catch (error) {
  console.error('Failed to send message:', error);
}

// Get conversation history
const history = manager.getHistory();
console.log('Messages:', history);

// Save session
manager.saveSession();

// Restore session (on page reload)
const restored = await manager.restoreSession();
if (restored) {
  console.log('Session restored successfully');
}

// Reset conversation
manager.reset();
```

### API

#### Methods

- `initialize(useCase: UseCase)`: Initialize with use case configuration
- `sendMessage(message: string)`: Send message and receive AI response
- `getHistory()`: Get conversation history (excludes system message)
- `reset()`: Clear conversation and start fresh
- `saveSession()`: Save session to Local Storage
- `restoreSession()`: Restore session from Local Storage

#### Types

```typescript
type UseCase = 'support' | 'sales' | 'education' | 'healthcare';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationResponse {
  message: string;
  conversationId: string;
  tokensUsed: number;
}
```

### Use Case Configurations

Each use case has a tailored system prompt and personality:

- **Support**: Helpful customer support assistant with empathetic responses
- **Sales**: Knowledgeable sales assistant that helps with purchasing decisions
- **Education**: Patient educational tutor that explains concepts clearly
- **Healthcare**: Compassionate healthcare information assistant

### Context Window Management

The manager maintains a rolling context window to optimize API usage:

- System message (always included)
- Last 10 exchanges (up to 20 messages: 10 user + 10 assistant)
- Older messages are automatically pruned but remain in local history

### Session Persistence

Sessions are automatically saved to Local Storage after each message exchange:

- **Storage Key**: `ai-avatar-session`
- **Expiration**: 24 hours from last access
- **Data Stored**: Conversation ID, use case, messages, timestamps
- **Corruption Handling**: Automatically clears corrupted session data

### Error Handling

The manager handles various error scenarios:

- **Empty Messages**: Rejects empty or whitespace-only messages
- **API Failures**: Rolls back user message on API errors
- **Network Errors**: Propagates network errors with context
- **Session Corruption**: Clears corrupted data and returns false on restore

### Requirements Validated

- **2.2**: Maintains conversation context for session duration
- **2.3**: Receives and processes LLM responses
- **2.5**: Supports conversations with 10+ message exchanges
- **10.2**: Stores session data in browser Local Storage
- **10.3**: Maintains conversation history while session is active
- **11.1**: Supports configuration profiles for multiple use cases
- **11.2**: Loads appropriate system prompt and personality per use case
