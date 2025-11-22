import type { RecordingEvent, RecordingState } from "@/types/recording";

export class Recorder {
  private state: RecordingState = {
    isRecording: false,
    events: []
  };

  private listeners: Set<() => void> = new Set();

  getState(): RecordingState {
    return { ...this.state };
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }

  startRecording(): void {
    this.state = {
      isRecording: true,
      events: [] // Clear previous events for fresh session
    };
    console.log("[Recorder] Recording started");
    this.notifyListeners();
  }

  stopRecording(): void {
    this.state.isRecording = false;
    console.log("[Recorder] Recording stopped. Captured events:", this.state.events);
    this.notifyListeners();
  }

  toggleRecording(): void {
    if (this.state.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  addEvent(event: Omit<RecordingEvent, "timestamp">): void {
    if (!this.state.isRecording) return;

    const recordingEvent: RecordingEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.state.events.push(recordingEvent);
    console.log("[Recorder] Event captured:", recordingEvent);
    this.notifyListeners();
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
