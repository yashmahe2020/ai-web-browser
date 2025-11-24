export type RecordedEventType =
  | "navigate"
  | "click"
  | "dblclick"
  | "contextmenu"
  | "input"
  | "submit"
  | "scroll"
  | "copy"
  | "paste"
  | "keydown"
  | "selection"
  | "tab_created"
  | "tab_switched";

export interface RecordedEvent {
  id: string;
  type: RecordedEventType;
  timestamp: number;
  tabId: number;
  url: string;
  title?: string;
  // DOM interaction specific fields
  selector?: string;
  value?: string;
  tagName?: string;
  innerText?: string;
  // Scroll specific fields
  scrollX?: number;
  scrollY?: number;
}

export type RecordingState = {
  isRecording: boolean;
  events: RecordedEvent[];
  sessionStartTime?: number;
};

export interface RecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: RecordedEvent[];
  metadata: {
    userAgent: string;
    flowVersion: string;
  };
}
