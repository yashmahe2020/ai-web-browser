import { createContext, useContext, useEffect, useState } from "react";
import { recorder } from "@/lib/recording/recorder";
import type { RecordingState, RecordedEvent } from "~/types/recording";

interface RecordingContextValue {
  isRecording: boolean;
  eventCount: number;
  toggleRecording: () => void;
  exportRecording: () => Promise<string | null>;
  getEvents: () => RecordedEvent[];
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export const useRecording = () => {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error("useRecording must be used within a RecordingProvider");
  }
  return context;
};

interface RecordingProviderProps {
  children: React.ReactNode;
}

export const RecordingProvider = ({ children }: RecordingProviderProps) => {
  const [state, setState] = useState<RecordingState>(recorder.getState());

  useEffect(() => {
    // Send initial state to main process on mount
    const initialState = recorder.getState();
    if (typeof window !== "undefined" && window.flow?.recording?.setRecordingState) {
      window.flow.recording.setRecordingState(initialState.isRecording);
    }

    // Subscribe to recorder state changes
    const unsubscribe = recorder.subscribe(() => {
      const newState = recorder.getState();
      setState(newState);
      
      // Notify main process of recording state change
      if (typeof window !== "undefined" && window.flow?.recording?.setRecordingState) {
        window.flow.recording.setRecordingState(newState.isRecording);
      }
    });

    return () => {
      unsubscribe();
      // Clean up recording state when provider unmounts (window closing)
      if (typeof window !== "undefined" && window.flow?.recording?.setRecordingState) {
        window.flow.recording.setRecordingState(false);
      }
    };
  }, []);

  useEffect(() => {
    // Listen for DOM events captured from content scripts
    if (typeof window !== "undefined" && window.flow?.recording?.onEventCaptured) {
      const unsubscribe = window.flow.recording.onEventCaptured((event) => {
        // Add the event to the recorder
        recorder.addEvent(event);
      });

      return () => {
        unsubscribe();
      };
    }

    return undefined;
  }, []);

  const toggleRecording = () => {
    recorder.toggleRecording();
  };

  const exportRecording = async (): Promise<string | null> => {
    const session = recorder.exportSession();
    if (!session) {
      console.error("[RecordingProvider] No active session to export");
      return null;
    }

    const sessionJSON = JSON.stringify(session, null, 2);

    // Call the IPC to export the recording
    if (typeof window !== "undefined" && window.flow?.recording?.exportRecording) {
      const filePath = await window.flow.recording.exportRecording(sessionJSON);
      return filePath;
    }

    console.error("[RecordingProvider] flow.recording.exportRecording not available");
    return null;
  };

  const getEvents = () => {
    return recorder.getEvents();
  };

  return (
    <RecordingContext.Provider
      value={{
        isRecording: state.isRecording,
        eventCount: state.events.length,
        toggleRecording,
        exportRecording,
        getEvents
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};
