export type RecordingEventType = "navigation" | "tab_created" | "tab_switched";

export type RecordingEvent = {
  timestamp: number;
  type: RecordingEventType;
  url: string;
  tabId: number;
  title?: string;
};

export type RecordingState = {
  isRecording: boolean;
  events: RecordingEvent[];
};
