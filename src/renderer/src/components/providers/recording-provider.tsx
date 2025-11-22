import { createContext, useContext, useEffect, useState } from "react";
import { recorder } from "@/lib/recording/recorder";
import type { RecordingState } from "@/types/recording";

interface RecordingContextValue {
  isRecording: boolean;
  eventCount: number;
  toggleRecording: () => void;
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

  const toggleRecording = () => {
    recorder.toggleRecording();
  };

  return (
    <RecordingContext.Provider
      value={{
        isRecording: state.isRecording,
        eventCount: state.events.length,
        toggleRecording
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};
