import { useRecording } from "@/components/providers/recording-provider";
import { motion, AnimatePresence } from "motion/react";
import { ActivityIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { RecordingViewer } from "./recording-viewer";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export function RecordingIndicator() {
  const { isRecording, eventCount } = useRecording();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + Shift + R to open viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        if (eventCount > 0) {
          setViewerOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [eventCount]);

  // Don't show if no events and not recording
  if (!isRecording && eventCount === 0) {
    return null;
  }

  return (
    <>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {(isRecording || eventCount > 0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-6 right-6 z-[10000] pointer-events-auto"
                style={{ 
                  position: "fixed",
                  bottom: "24px",
                  right: "24px",
                  zIndex: 10000
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
            <motion.button
              onClick={() => {
                if (eventCount > 0) {
                  setViewerOpen(true);
                }
              }}
              disabled={eventCount === 0}
              className={cn(
                "group relative flex items-center gap-3 px-5 py-4 rounded-full shadow-2xl",
                "bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800",
                "border-2 border-red-400 dark:border-red-500",
                "backdrop-blur-sm",
                "transition-all duration-200",
                "ring-2 ring-red-500/30",
                eventCount > 0
                  ? "cursor-pointer hover:scale-110 hover:shadow-red-500/70 hover:ring-red-400/50 active:scale-95"
                  : "cursor-default opacity-90",
                isRecording && "ring-red-400 animate-pulse"
              )}
              title={
                eventCount > 0
                  ? `View ${eventCount} recorded events (Cmd/Ctrl+Shift+R)`
                  : isRecording
                    ? "Recording in progress..."
                    : "No events recorded"
              }
            >
              {/* Pulsing dot when recording */}
              {isRecording && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.5, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}

              <div className="flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-white" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white">
                    {isRecording ? "Recording" : "Recorded"}
                  </span>
                  {eventCount > 0 && (
                    <span className="text-xs text-red-100">
                      {eventCount} {eventCount === 1 ? "event" : "events"}
                    </span>
                  )}
                </div>
              </div>

              {/* Click hint when hovered and has events */}
              {isHovered && eventCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none"
                >
                  Click to view
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-4 border-l-gray-900 border-b-4 border-b-transparent" />
                  </div>
                </motion.div>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      <RecordingViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />
    </>
  );
}

