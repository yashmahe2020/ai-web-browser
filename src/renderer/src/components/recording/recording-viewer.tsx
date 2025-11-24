import { useRecording } from "@/components/providers/recording-provider";
import { motion, AnimatePresence } from "motion/react";
import { XIcon, DownloadIcon } from "lucide-react";
import type { RecordedEvent } from "~/types/recording";

interface RecordingViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecordingViewer({ isOpen, onClose }: RecordingViewerProps) {
  const { events, exportRecording, isRecording, eventCount } = useRecording();

  // Debug logging to verify events are being retrieved
  console.log("[RecordingViewer] Events:", events, "Count:", eventCount);

  const handleExport = async () => {
    const filePath = await exportRecording();
    if (filePath) {
      alert(`Recording exported to:\n${filePath}`);
    } else {
      alert("Failed to export recording");
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getEventColor = (type: RecordedEvent["type"]) => {
    switch (type) {
      case "navigate":
        return "text-blue-400";
      case "click":
        return "text-green-400";
      case "dblclick":
        return "text-green-300";
      case "contextmenu":
        return "text-green-500";
      case "input":
        return "text-yellow-400";
      case "submit":
        return "text-purple-400";
      case "scroll":
        return "text-gray-400";
      case "copy":
        return "text-pink-400";
      case "paste":
        return "text-pink-300";
      case "keydown":
        return "text-indigo-400";
      case "selection":
        return "text-violet-400";
      case "tab_created":
        return "text-cyan-400";
      case "tab_switched":
        return "text-orange-400";
      default:
        return "text-white";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-900 rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">Recording Events</h2>
                <p className="text-sm text-gray-400">
                  {eventCount} events • {isRecording ? "Recording..." : "Not recording"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  <XIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto p-4">
              {eventCount === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No events recorded yet. Start recording to capture browser interactions.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800 rounded p-3 hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-semibold ${getEventColor(event.type)}`}>
                              {event.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-300 truncate">{event.url}</div>
                          {event.selector && (
                            <div className="mt-1 text-xs text-gray-500 font-mono truncate">
                              {event.selector}
                            </div>
                          )}
                          {event.innerText && (
                            <div className="mt-1 text-xs text-gray-400 truncate">
                              &ldquo;{event.innerText}&rdquo;
                            </div>
                          )}
                          {event.value && (
                            <div className="mt-1 text-xs text-gray-400 truncate">
                              Value: {event.value}
                            </div>
                          )}
                          {event.type === "scroll" && (
                            <div className="mt-1 text-xs text-gray-400">
                              Position: ({event.scrollX}, {event.scrollY})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
