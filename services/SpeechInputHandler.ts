/**
 * Speech Input Handler
 * Feature: ai-avatar-system
 * 
 * Captures and converts user speech to text using Web Speech API.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 12.2
 */

export interface SpeechError {
  code: string;
  message: string;
}

export interface SpeechInputHandler {
  // Check if speech recognition is available
  isSupported(): boolean;
  
  // Start listening for speech
  startListening(): void;
  
  // Stop listening
  stopListening(): void;
  
  // Get current listening state
  isListening(): boolean;
  
  // Event handlers
  onSpeechDetected(callback: (text: string) => void): void;
  onError(callback: (error: SpeechError) => void): void;
  onListeningStateChange(callback: (isListening: boolean) => void): void;
}

// Browser compatibility types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class DefaultSpeechInputHandler implements SpeechInputHandler {
  private recognition: ISpeechRecognition | null = null;
  private listening = false;
  private speechCallback?: (text: string) => void;
  private errorCallback?: (error: SpeechError) => void;
  private listeningStateCallback?: (isListening: boolean) => void;
  private supported = false;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    // Check for browser support
    const SpeechRecognitionAPI = 
      typeof window !== 'undefined' 
        ? (window.SpeechRecognition || window.webkitSpeechRecognition)
        : undefined;

    if (!SpeechRecognitionAPI) {
      this.supported = false;
      return;
    }

    try {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      // Set up event handlers
      this.recognition.onstart = () => {
        this.listening = true;
        this.notifyListeningStateChange(true);
      };

      this.recognition.onend = () => {
        this.listening = false;
        this.notifyListeningStateChange(false);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        if (results.length > 0) {
          const result = results[event.resultIndex];
          if (result.isFinal && result.length > 0) {
            const transcript = result[0].transcript;
            if (this.speechCallback) {
              this.speechCallback(transcript);
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const error: SpeechError = {
          code: event.error,
          message: this.getErrorMessage(event.error),
        };
        
        this.listening = false;
        this.notifyListeningStateChange(false);
        
        if (this.errorCallback) {
          this.errorCallback(error);
        }
      };

      this.supported = true;
    } catch (error) {
      this.supported = false;
      console.error('Failed to initialize speech recognition:', error);
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  startListening(): void {
    if (!this.supported || !this.recognition) {
      const error: SpeechError = {
        code: 'not-supported',
        message: 'Speech recognition is not supported in this browser. Please use text input instead.',
      };
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      return;
    }

    if (this.listening) {
      return; // Already listening
    }

    try {
      this.recognition.start();
    } catch (error) {
      const speechError: SpeechError = {
        code: 'start-failed',
        message: 'Failed to start speech recognition. Please try again.',
      };
      if (this.errorCallback) {
        this.errorCallback(speechError);
      }
    }
  }

  stopListening(): void {
    if (!this.recognition || !this.listening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  isListening(): boolean {
    return this.listening;
  }

  onSpeechDetected(callback: (text: string) => void): void {
    this.speechCallback = callback;
  }

  onError(callback: (error: SpeechError) => void): void {
    this.errorCallback = callback;
  }

  onListeningStateChange(callback: (isListening: boolean) => void): void {
    this.listeningStateCallback = callback;
  }

  private notifyListeningStateChange(isListening: boolean): void {
    if (this.listeningStateCallback) {
      this.listeningStateCallback(isListening);
    }
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try again.',
      'aborted': 'Speech recognition was aborted.',
      'audio-capture': 'No microphone was found or microphone access was denied.',
      'network': 'Network error occurred. Please check your connection.',
      'not-allowed': 'Microphone access was denied. Please allow microphone access in your browser settings.',
      'service-not-allowed': 'Speech recognition service is not allowed.',
      'bad-grammar': 'Speech recognition grammar error.',
      'language-not-supported': 'The specified language is not supported.',
    };

    return errorMessages[errorCode] || `Speech recognition error: ${errorCode}`;
  }
}
