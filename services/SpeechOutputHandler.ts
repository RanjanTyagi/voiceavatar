/**
 * Speech Output Handler
 * Feature: ai-avatar-system
 * 
 * Converts AI responses to speech using Web Speech API with OpenAI TTS fallback.
 * Validates: Requirements 4.1, 4.2, 4.4, 4.5, 12.3
 */

export interface SpeechError {
  code: string;
  message: string;
}

export interface SpeechOutputHandler {
  // Check if text-to-speech is available
  isSupported(): boolean;
  
  // Speak the provided text
  speak(text: string): Promise<void>;
  
  // Control playback
  pause(): void;
  resume(): void;
  stop(): void;
  
  // Get current state
  isSpeaking(): boolean;
  
  // Event handlers
  onSpeechStart(callback: () => void): void;
  onSpeechEnd(callback: () => void): void;
  onError(callback: (error: SpeechError) => void): void;
}

export class DefaultSpeechOutputHandler implements SpeechOutputHandler {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private paused = false;
  private supported = false;
  
  private speechStartCallback?: () => void;
  private speechEndCallback?: () => void;
  private errorCallback?: (error: SpeechError) => void;
  
  // Fallback configuration
  private fallbackEnabled = false;
  private fallbackApiEndpoint = '/api/tts';

  constructor(enableFallback = false) {
    this.fallbackEnabled = enableFallback;
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechSynthesis(): void {
    // Check for browser support
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        this.synthesis = window.speechSynthesis;
        this.supported = true;
      } else {
        this.supported = false;
      }
    } catch (error) {
      this.supported = false;
      console.error('Failed to initialize speech synthesis:', error);
    }
  }

  isSupported(): boolean {
    return this.supported || this.fallbackEnabled;
  }

  async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Stop any current speech
    this.stop();

    // Try Web Speech API first
    if (this.supported && this.synthesis) {
      try {
        await this.speakWithWebSpeech(text);
        return;
      } catch (error) {
        console.error('Web Speech API failed:', error);
        
        // If fallback is enabled, try OpenAI TTS
        if (this.fallbackEnabled) {
          try {
            await this.speakWithFallback(text);
            return;
          } catch (fallbackError) {
            this.handleError('fallback-failed', 'Both speech systems failed. Please check your connection.');
            throw fallbackError;
          }
        } else {
          this.handleError('speech-failed', 'Speech output failed. Please try again.');
          throw error;
        }
      }
    } else if (this.fallbackEnabled) {
      // Web Speech not supported, use fallback directly
      try {
        await this.speakWithFallback(text);
      } catch (error) {
        this.handleError('fallback-failed', 'Speech output is unavailable. Displaying text only.');
        throw error;
      }
    } else {
      const error = new Error('Speech synthesis not supported');
      this.handleError('not-supported', 'Speech output is not supported in this browser.');
      throw error;
    }
  }

  private async speakWithWebSpeech(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this.speaking = true;
        this.paused = false;
        if (this.speechStartCallback) {
          this.speechStartCallback();
        }
      };

      utterance.onend = () => {
        this.speaking = false;
        this.paused = false;
        this.currentUtterance = null;
        if (this.speechEndCallback) {
          this.speechEndCallback();
        }
        resolve();
      };

      utterance.onerror = (event) => {
        this.speaking = false;
        this.paused = false;
        this.currentUtterance = null;
        
        const errorMessage = this.getSpeechSynthesisErrorMessage(event.error);
        this.handleError(event.error, errorMessage);
        reject(new Error(errorMessage));
      };

      try {
        this.synthesis.speak(utterance);
      } catch (error) {
        this.speaking = false;
        this.currentUtterance = null;
        reject(error);
      }
    });
  }

  private async speakWithFallback(text: string): Promise<void> {
    try {
      const response = await fetch(this.fallbackApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS API failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audioUrl) {
        throw new Error('No audio URL returned from TTS API');
      }

      // Play the audio
      await this.playAudioUrl(data.audioUrl);
    } catch (error) {
      console.error('Fallback TTS failed:', error);
      throw error;
    }
  }

  private async playAudioUrl(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      audio.onloadstart = () => {
        this.speaking = true;
        if (this.speechStartCallback) {
          this.speechStartCallback();
        }
      };

      audio.onended = () => {
        this.speaking = false;
        if (this.speechEndCallback) {
          this.speechEndCallback();
        }
        resolve();
      };

      audio.onerror = () => {
        this.speaking = false;
        reject(new Error('Failed to play audio'));
      };

      audio.play().catch(reject);
    });
  }

  pause(): void {
    if (!this.synthesis || !this.speaking || this.paused) {
      return;
    }

    try {
      this.synthesis.pause();
      this.paused = true;
    } catch (error) {
      console.error('Failed to pause speech:', error);
    }
  }

  resume(): void {
    if (!this.synthesis || !this.paused) {
      return;
    }

    try {
      this.synthesis.resume();
      this.paused = false;
    } catch (error) {
      console.error('Failed to resume speech:', error);
    }
  }

  stop(): void {
    if (!this.synthesis) {
      return;
    }

    try {
      this.synthesis.cancel();
      this.speaking = false;
      this.paused = false;
      this.currentUtterance = null;
    } catch (error) {
      console.error('Failed to stop speech:', error);
    }
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  onSpeechStart(callback: () => void): void {
    this.speechStartCallback = callback;
  }

  onSpeechEnd(callback: () => void): void {
    this.speechEndCallback = callback;
  }

  onError(callback: (error: SpeechError) => void): void {
    this.errorCallback = callback;
  }

  private handleError(code: string, message: string): void {
    if (this.errorCallback) {
      this.errorCallback({ code, message });
    }
  }

  private getSpeechSynthesisErrorMessage(errorType: string): string {
    const errorMessages: Record<string, string> = {
      'canceled': 'Speech was canceled.',
      'interrupted': 'Speech was interrupted by another utterance.',
      'audio-busy': 'Audio output device is busy.',
      'audio-hardware': 'Audio hardware error occurred.',
      'network': 'Network error occurred during speech synthesis.',
      'synthesis-unavailable': 'Speech synthesis is temporarily unavailable.',
      'synthesis-failed': 'Speech synthesis failed.',
      'language-unavailable': 'The requested language is not available.',
      'voice-unavailable': 'The requested voice is not available.',
      'text-too-long': 'The text is too long to synthesize.',
      'invalid-argument': 'Invalid argument provided to speech synthesis.',
      'not-allowed': 'Speech synthesis is not allowed in this context.',
    };

    return errorMessages[errorType] || `Speech synthesis error: ${errorType}`;
  }
}
