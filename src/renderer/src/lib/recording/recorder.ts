import type { RecordedEvent, RecordingState, RecordingSession } from "~/types/recording";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class Recorder {
  private state: RecordingState = {
    isRecording: false,
    events: [],
    sessionStartTime: undefined
  };

  private sessionId: string | null = null;
  private listeners: Set<() => void> = new Set();

  getState(): RecordingState {
    return { ...this.state };
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  getEvents(): RecordedEvent[] {
    return [...this.state.events];
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  startRecording(): void {
    const now = Date.now();
    this.sessionId = generateId();
    this.state = {
      isRecording: true,
      events: [], // Clear previous events for fresh session
      sessionStartTime: now
    };
    console.log("[Recorder] Recording started - Session:", this.sessionId);
    this.notifyListeners();
  }

  stopRecording(): void {
    this.state.isRecording = false;
    console.log("[Recorder] Recording stopped. Captured events:", this.state.events.length);
    this.notifyListeners();
  }

  toggleRecording(): void {
    if (this.state.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  addEvent(event: Omit<RecordedEvent, "timestamp" | "id">): void {
    if (!this.state.isRecording) return;

    const recordedEvent: RecordedEvent = {
      id: generateId(),
      timestamp: Date.now(),
      ...event
    };

    this.state.events.push(recordedEvent);
    console.log("[Recorder] Event captured:", recordedEvent.type, recordedEvent.url);
    this.notifyListeners();
  }

  clearEvents(): void {
    this.state.events = [];
    this.notifyListeners();
  }

  exportSession(): RecordingSession | null {
    if (!this.sessionId || !this.state.sessionStartTime) {
      return null;
    }

    return {
      id: this.sessionId,
      startTime: this.state.sessionStartTime,
      endTime: this.state.isRecording ? undefined : Date.now(),
      events: [...this.state.events],
      metadata: {
        userAgent: navigator.userAgent,
        flowVersion: "0.8.3" // TODO: Get from package.json or app context
      }
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Singleton instance
export const recorder = new Recorder();
