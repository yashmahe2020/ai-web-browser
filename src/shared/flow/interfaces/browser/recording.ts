import type { RecordedEvent } from "~/types/recording";

export interface FlowRecordingAPI {
  /**
   * Check if recording is currently enabled in the browser
   */
  isRecording: () => Promise<boolean>;

  /**
   * Export the current recording session to a JSON file
   * @param sessionData - JSON string of the recording session
   * Returns the file path where the recording was saved
   */
  exportRecording: (sessionData: string) => Promise<string | null>;

  /**
   * Send a DOM event from the content script to the recorder
   */
  captureEvent: (event: Omit<RecordedEvent, "id" | "timestamp">) => void;

  /**
   * Listen for recording state changes
   */
  onRecordingStateChanged: (callback: (isRecording: boolean) => void) => () => void;

  /**
   * Listen for DOM events captured from content scripts
   */
  onEventCaptured: (callback: (event: Omit<RecordedEvent, "id" | "timestamp">) => void) => () => void;

  /**
   * Notify the main process that recording state has changed
   * @param isRecording - Whether recording is now active
   */
  setRecordingState: (isRecording: boolean) => void;
}

declare global {
  interface Window {
    flow: {
      recording: FlowRecordingAPI;
    };
  }
}
