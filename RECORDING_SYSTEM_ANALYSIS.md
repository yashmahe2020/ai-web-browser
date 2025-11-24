# Recording System - Complete Deep Dive Analysis

## Overview

The Flow Browser recording system is a comprehensive action-recording feature that captures user interactions and browser navigation events. It records DOM interactions (clicks, inputs, submits, scrolls) from web pages and browser-level events (navigation, tab creation, tab switching).

---

## 🎯 What Gets Recorded

### Event Types

The system records **7 different event types**:

1. **`navigate`** - URL changes within a tab
   - Captured by: `RecordingListener` component
   - Data: `url`, `tabId`, `title`

2. **`click`** - User clicks on DOM elements
   - Captured by: Content script (injected into web pages)
   - Data: `url`, `tabId`, `selector`, `tagName`, `innerText`

3. **`input`** - User input in form fields
   - Captured by: Content script
   - Data: `url`, `tabId`, `selector`, `tagName`, `value`

4. **`submit`** - Form submissions
   - Captured by: Content script
   - Data: `url`, `tabId`, `selector`, `tagName`

5. **`scroll`** - Page scrolling (debounced to 500ms)
   - Captured by: Content script
   - Data: `url`, `tabId`, `scrollX`, `scrollY`

6. **`tab_created`** - New tabs created
   - Captured by: `RecordingListener` component
   - Data: `url`, `tabId`, `title`

7. **`tab_switched`** - Switching between tabs
   - Captured by: `RecordingListener` component
   - Data: `url`, `tabId`, `title`

---

## 🔄 Complete Flow: Button Press to Storage

### Step 1: User Clicks Record Button

**Location:** `src/renderer/src/components/browser-ui/sidebar/header/action-buttons.tsx`

```100:129:src/renderer/src/components/browser-ui/sidebar/header/action-buttons.tsx
function RecordButton() {
  const { isRecording, toggleRecording, eventCount } = useRecording();
  const [viewerOpen, setViewerOpen] = useState(false);

  const RecordIcon = isRecording ? CircleDotIcon : CircleIcon;
  const iconClassName = cn(
    "w-4 h-4",
    isRecording && "fill-red-500 text-red-500"
  );

  return (
    <>
      <SidebarActionButton
        icon={<RecordIcon className={iconClassName} />}
        onClick={toggleRecording}
        className={cn(SIDEBAR_HOVER_COLOR, isRecording && "bg-red-500/10 dark:bg-red-500/20")}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      />
      {eventCount > 0 && (
        <SidebarActionButton
          icon={<ListIcon className="w-4 h-4" />}
          onClick={() => setViewerOpen(true)}
          className={SIDEBAR_HOVER_COLOR}
          title={`View ${eventCount} recorded events`}
        />
      )}
      <RecordingViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} />
    </>
  );
}
```

**What happens:**
- Button calls `toggleRecording()` from `RecordingProvider`
- Visual feedback: Icon changes from `CircleIcon` to `CircleDotIcon` (filled red)
- Background color changes to red tint when recording

### Step 2: RecordingProvider Toggles State

**Location:** `src/renderer/src/components/providers/recording-provider.tsx`

```46:48:src/renderer/src/components/providers/recording-provider.tsx
  const toggleRecording = () => {
    recorder.toggleRecording();
  };
```

This calls the singleton `Recorder` instance.

### Step 3: Recorder Updates State

**Location:** `src/renderer/src/lib/recording/recorder.ts`

```33:43:src/renderer/src/lib/recording/recorder.ts
  startRecording(): void {
    const now = Date.now();
    this.sessionId = generateId();
    this.state = {
      isRecording: true,
      events: [], // Clear previous events for fresh session
      sessionStartTime: now
    };
    console.log("[Recorder] Recording started - Session:", this.sessionId);
    this.notifyListeners();
  }
```

**What happens:**
- Generates unique session ID: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
- Clears previous events (fresh session)
- Sets `sessionStartTime`
- Notifies all subscribers (React components)

### Step 4: Event Capture Begins

#### A. Browser-Level Events (Navigation, Tabs)

**Location:** `src/renderer/src/components/logic/recording-listener.tsx`

```18:49:src/renderer/src/components/logic/recording-listener.tsx
  useEffect(() => {
    if (!isRecording || !focusedTab) {
      prevFocusedTabRef.current = focusedTab
        ? { id: focusedTab.id, url: focusedTab.url }
        : null;
      return;
    }

    const currentTab = { id: focusedTab.id, url: focusedTab.url };
    const prevTab = prevFocusedTabRef.current;

    // Check if this is a new tab or if the tab switched
    if (!prevTab || prevTab.id !== currentTab.id) {
      // Tab switched or new tab focused
      recorder.addEvent({
        type: prevTab === null ? "tab_created" : "tab_switched",
        url: currentTab.url,
        tabId: currentTab.id,
        title: focusedTab.title
      });
    } else if (prevTab.url !== currentTab.url) {
      // URL changed (navigation within same tab)
      recorder.addEvent({
        type: "navigate",
        url: currentTab.url,
        tabId: currentTab.id,
        title: focusedTab.title
      });
    }

    prevFocusedTabRef.current = currentTab;
  }, [focusedTab, isRecording]);
```

**How it works:**
- React `useEffect` hook monitors `focusedTab` and `isRecording`
- Compares previous tab state to detect changes
- Records events directly to `recorder.addEvent()`

#### B. DOM Events (Clicks, Inputs, Scrolls)

**Location:** `src/preload/index.ts` (injected into web pages)

```648:772:src/preload/index.ts
// INJECT DOM RECORDER INTO WEB PAGES //
// Only inject into external web pages, not Flow's internal pages
const isExternalWebPage =
  !location.protocol.startsWith("flow:") &&
  !location.protocol.startsWith("flow-internal:") &&
  (location.protocol === "http:" || location.protocol === "https:");

if (isExternalWebPage) {
  // Inject the DOM recorder script into the page context
  const script = document.createElement("script");
  script.textContent = `
  (function() {
    if (typeof window === "undefined" || !window.flow?.recording) return;

    const flow = window.flow;
    let isRecording = false;
    let checkInterval = null;

    function generateSelector(element) {
      if (element.id) return "#" + element.id;
      const path = [];
      let current = element;
      while (current && current !== document.body && path.length < 5) {
        let selector = current.tagName.toLowerCase();
        if (current.classList.length > 0) {
          const classes = Array.from(current.classList).slice(0, 2).map(c => "." + c).join("");
          selector += classes;
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join(" > ");
    }

    function getElementText(element) {
      const text = element.textContent?.trim();
      if (!text || text.length === 0) return undefined;
      return text.length > 50 ? text.substring(0, 47) + "..." : text;
    }

    function handleClick(event) {
      if (!isRecording) return;
      const target = event.target;
      if (!target) return;
      flow.recording.captureEvent({
        type: "click",
        url: window.location.href,
        tabId: 0,
        selector: generateSelector(target),
        tagName: target.tagName.toLowerCase(),
        innerText: getElementText(target)
      });
    }

    function handleInput(event) {
      if (!isRecording) return;
      const target = event.target;
      if (!target) return;
      flow.recording.captureEvent({
        type: "input",
        url: window.location.href,
        tabId: 0,
        selector: generateSelector(target),
        tagName: target.tagName.toLowerCase(),
        value: target.value
      });
    }

    function handleSubmit(event) {
      if (!isRecording) return;
      const target = event.target;
      if (!target) return;
      flow.recording.captureEvent({
        type: "submit",
        url: window.location.href,
        tabId: 0,
        selector: generateSelector(target),
        tagName: target.tagName.toLowerCase()
      });
    }

    let scrollTimeout = null;
    function handleScroll() {
      if (!isRecording) return;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        flow.recording.captureEvent({
          type: "scroll",
          url: window.location.href,
          tabId: 0,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        });
      }, 500);
    }

    async function checkRecordingState() {
      try {
        const recording = await flow.recording.isRecording();
        if (recording !== isRecording) {
          isRecording = recording;
          console.log("[DOMRecorder] Recording:", isRecording);
        }
      } catch (error) {
        console.error("[DOMRecorder] Error:", error);
      }
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("scroll", handleScroll, true);
    checkInterval = setInterval(checkRecordingState, 2000);
    checkRecordingState();
  })();
  `;

  if (document.head) {
    document.head.appendChild(script);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.head.appendChild(script);
    });
  }
}
```

**How it works:**
- Script is injected into **external web pages only** (http/https, not flow:// or flow-internal://)
- Event listeners attached with `capture: true` (capture phase)
- Polls recording state every 2 seconds via `flow.recording.isRecording()`
- Events sent via `flow.recording.captureEvent()` → IPC → Main process

**IPC Flow for DOM Events:**

```587:595:src/preload/index.ts
const recordingAPI: FlowRecordingAPI = {
  async isRecording() {
    return ipcRenderer.invoke("recording:is-recording");
  },
  async exportRecording(sessionData: string) {
    return ipcRenderer.invoke("recording:export", sessionData);
  },
  captureEvent(event) {
    return ipcRenderer.send("recording:capture-event", event);
  },
```

**Main Process Handler:**

```53:65:src/main/ipc/browser/recording.ts
// Handle DOM events captured from content scripts
ipcMain.on("recording:capture-event", (event, eventData) => {
  // Forward the event to all browser UI windows
  // The sender is the content script/web page, we need to forward to the browser UI
  const webContentsId = event.sender.id;

  // For now, just broadcast to the same webContents (the browser UI should be listening)
  listenersManager.sendToWebContents(
    webContentsId,
    "recording:on-event-captured",
    eventData
  );
});
```

**⚠️ CRITICAL ISSUE FOUND:** The main process broadcasts events to `recording:on-event-captured`, but **there is no listener in the renderer** to receive these events and add them to the recorder. This means DOM events (clicks, inputs, scrolls, submits) from content scripts are **NOT actually being recorded** - they're being sent but not stored.

### Step 5: Events Stored in Memory

**Location:** `src/renderer/src/lib/recording/recorder.ts`

```59:71:src/renderer/src/lib/recording/recorder.ts
  addEvent(event: Omit<RecordedEvent, "timestamp" | "id">): void {
    if (!this.state.isRecording) return;

    const recordedEvent: RecordedEvent = {
      id: generateId(),
      timestamp: Date.now(),
      ...event
    };

    this.state.events.push(recordedEvent);
    console.log("[Recorder] Event captured:", recordedEvent.type, recordedEvent.url);
    this.notifyListeners();
  }
```

**Storage:**
- Events stored in **memory only** (not persisted to disk)
- Stored in `Recorder.state.events` array
- Each event gets unique ID and timestamp
- Events cleared when new recording session starts

### Step 6: Viewing Events

**Location:** `src/renderer/src/components/recording/recording-viewer.tsx`

When `eventCount > 0`, a second button appears (list icon) that opens the `RecordingViewer` modal:

```11:147:src/renderer/src/components/recording/recording-viewer.tsx
export function RecordingViewer({ isOpen, onClose }: RecordingViewerProps) {
  const { getEvents, exportRecording, isRecording, eventCount } = useRecording();

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
      case "input":
        return "text-yellow-400";
      case "submit":
        return "text-purple-400";
      case "scroll":
        return "text-gray-400";
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
                  {getEvents().map((event) => (
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
```

### Step 7: Exporting Recordings

**Location:** `src/renderer/src/components/providers/recording-provider.tsx`

```50:67:src/renderer/src/components/providers/recording-provider.tsx
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
```

**Session Export Format:**

```78:93:src/renderer/src/lib/recording/recorder.ts
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
```

**File Storage:**

```16:39:src/main/ipc/browser/recording.ts
ipcMain.handle("recording:export", async (event, sessionData: string) => {
  try {
    // Get the recordings directory in userData
    const userDataPath = app.getPath("userData");
    const recordingsDir = path.join(userDataPath, "recordings");

    // Ensure the recordings directory exists
    await fs.mkdir(recordingsDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.json`;
    const filePath = path.join(recordingsDir, filename);

    // Write the session data to file
    await fs.writeFile(filePath, sessionData, "utf-8");

    console.log("[Recording] Exported recording to:", filePath);
    return filePath;
  } catch (error) {
    console.error("[Recording] Failed to export recording:", error);
    return null;
  }
});
```

**Storage Location:**
- **macOS:** `~/Library/Application Support/Flow/recordings/`
- **Windows:** `%APPDATA%/Flow/recordings/`
- **Linux:** `~/.config/Flow/recordings/`

**File Format:** JSON with timestamp-based filename: `recording-2025-11-22T02-30-45-123Z.json`

---

## 📊 Data Storage

### In-Memory Storage

**Location:** `Recorder.state.events` array

- **Type:** `RecordedEvent[]`
- **Persistence:** None - cleared on app restart
- **Lifecycle:** Cleared when new recording session starts

### Persistent Storage

**Location:** `{userData}/recordings/` directory

- **Format:** JSON files
- **Trigger:** Manual export via "Export" button in RecordingViewer
- **Content:** Full `RecordingSession` object with metadata

### Event Data Structure

```1:25:src/renderer/src/types/recording.ts
export type RecordedEventType =
  | "navigate"
  | "click"
  | "input"
  | "submit"
  | "scroll"
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
```

---

## 🔍 When Recording Works

### ✅ Recording IS Active When:

1. **User clicks record button** → `isRecording = true`
2. **Browser UI is loaded** → `RecordingListener` component mounted
3. **User navigates** → Navigation events captured
4. **User creates/switches tabs** → Tab events captured
5. **User is on external web pages** → Content script injected

### ❌ Recording Does NOT Work When:

1. **User is on Flow internal pages** (`flow://`, `flow-internal://`)
   - Content script is **not injected** into these pages
   - DOM events (clicks, inputs) **not captured**

2. **Content script events are not being stored** (BUG)
   - Events sent via IPC but no listener in renderer
   - DOM events are **lost**

3. **Recording is stopped** → `isRecording = false`
   - All event handlers check this flag first

4. **App is closed** → All in-memory events lost (unless exported)

---

## 🐛 Known Issues

### Critical Bug: DOM Events Not Being Recorded

**Problem:** Content scripts send events via `flow.recording.captureEvent()` → IPC → Main process broadcasts to `recording:on-event-captured`, but **no renderer listener exists** to add these events to the recorder.

**Impact:** 
- ✅ Navigation events work (handled by `RecordingListener`)
- ✅ Tab events work (handled by `RecordingListener`)
- ❌ Click events **NOT recorded**
- ❌ Input events **NOT recorded**
- ❌ Submit events **NOT recorded**
- ❌ Scroll events **NOT recorded**

**Fix Required:** Add IPC listener in renderer to receive `recording:on-event-captured` events and call `recorder.addEvent()`.

### Minor Issues:

1. **Tab ID in DOM events is always 0**
   - Content scripts use `tabId: 0` (hardcoded)
   - Should get actual tab ID from context

2. **Polling-based state sync**
   - Content scripts poll every 2 seconds
   - Could use event-based sync via IPC

3. **No persistence of in-memory events**
   - Events lost on app restart unless exported
   - Could auto-save periodically

---

## 🎯 Summary

### What Works:
- ✅ Recording button UI and state management
- ✅ Navigation event recording
- ✅ Tab creation/switching event recording
- ✅ Event viewer UI
- ✅ Export to JSON file
- ✅ Session management (IDs, timestamps)

### What Doesn't Work:
- ❌ DOM event recording (clicks, inputs, submits, scrolls) - **BUG**
- ❌ Recording on Flow internal pages (by design, but could be improved)

### Storage:
- **In-Memory:** Active recording session (cleared on new session)
- **Persistent:** Only via manual export to JSON files

### Architecture:
- **Browser UI:** React components, singleton Recorder class
- **Content Scripts:** Injected into external web pages only
- **IPC:** Communication between renderer and main process
- **Main Process:** File system operations, state broadcasting

---

**Last Updated:** Analysis completed after user updates
**Status:** System functional for navigation/tab events, DOM events have critical bug



