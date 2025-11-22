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
    // Subscribe to recorder state changes
    const unsubscribe = recorder.subscribe(() => {
      setState(recorder.getState());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Recording state changes are polled by content scripts via isRecording()
    // No need to broadcast state changes explicitly
  }, [state.isRecording]);

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
