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
    console.log(
      `[Recording] Started at ${new Date(now).toISOString()}`,
      `\n  Session ID: ${this.sessionId}`,
      `\n  Timestamp: ${now}`
    );
    this.notifyListeners();
  }

  stopRecording(): void {
    this.state.isRecording = false;
    const duration = this.state.sessionStartTime
      ? Date.now() - this.state.sessionStartTime
      : 0;
    console.log(
      `[Recording] Stopped at ${new Date().toISOString()}`,
      `\n  Total events captured: ${this.state.events.length}`,
      `\n  Duration: ${(duration / 1000).toFixed(2)}s`,
      `\n  Session ID: ${this.sessionId}`
    );
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

    // Comprehensive event logging
    const eventDetails: Record<string, unknown> = {
      type: recordedEvent.type,
      url: recordedEvent.url,
      timestamp: new Date(recordedEvent.timestamp).toISOString()
    };

    if (recordedEvent.selector) eventDetails.selector = recordedEvent.selector;
    if (recordedEvent.tagName) eventDetails.tagName = recordedEvent.tagName;
    if (recordedEvent.innerText) eventDetails.innerText = recordedEvent.innerText;
    if (recordedEvent.value) eventDetails.value = recordedEvent.value;
    if (recordedEvent.scrollX !== undefined) eventDetails.scrollX = recordedEvent.scrollX;
    if (recordedEvent.scrollY !== undefined) eventDetails.scrollY = recordedEvent.scrollY;
    if (recordedEvent.tabId !== undefined) eventDetails.tabId = recordedEvent.tabId;

    console.log(
      `[Recording] Event captured: ${recordedEvent.type.toUpperCase()}`,
      `\n  Event #${this.state.events.length}`,
      `\n  Details:`, eventDetails
    );

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
