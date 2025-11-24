import { ipcMain, app } from "electron";
import fs from "fs/promises";
import path from "path";
import { sendMessageToListeners } from "@/ipc/listeners-manager";
import { browserWindowsController } from "@/controllers/windows-controller/interfaces/browser";

// Store recording state per browser window (keyed by browser window's main webContents ID)
const recordingState = new Map<number, boolean>();
// Track which webContents have cleanup listeners to avoid duplicates
const webContentsCleanupListeners = new Set<number>();

// Helper function to set up cleanup listener for a webContents
function setupCleanupListener(webContentsId: number, webContents: Electron.WebContents) {
  if (webContentsCleanupListeners.has(webContentsId)) {
    return; // Already has cleanup listener
  }
  
  webContentsCleanupListeners.add(webContentsId);
  webContents.once("destroyed", () => {
    recordingState.delete(webContentsId);
    webContentsCleanupListeners.delete(webContentsId);
  });
}

ipcMain.handle("recording:is-recording", async (event) => {
  const senderWebContents = event.sender;
  
  // Find the browser window that contains this webContents (could be a content script)
  const window = browserWindowsController.getWindowFromWebContents(senderWebContents);
  if (!window) {
    // If we can't find a window, return false
    return false;
  }
  
  // Get the browser window's main webContents ID (the renderer process)
  const browserWebContentsId = window.browserWindow.webContents.id;
  
  // Return the recording state for this browser window
  return recordingState.get(browserWebContentsId) ?? false;
});

ipcMain.handle("recording:export", async (_event, sessionData: string) => {
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

ipcMain.on("recording:state-changed", (event, isRecording: boolean) => {
  const webContents = event.sender;
  const webContentsId = webContents.id;
  
  recordingState.set(webContentsId, isRecording);
  
  // Set up cleanup listener for this webContents if not already set up
  setupCleanupListener(webContentsId, webContents);

  // Notify all listeners (browser UI windows) that recording state changed
  sendMessageToListeners("recording:on-state-changed", isRecording);
});

// Handle DOM events captured from content scripts
ipcMain.on("recording:capture-event", (_event, eventData) => {
  // Forward the event to all browser UI windows that are listening
  // The sender is the content script/web page, we forward to the browser UI
  sendMessageToListeners("recording:on-event-captured", eventData);
});

// Clean up state when window is closed
ipcMain.on("recording:cleanup", (event) => {
  const webContentsId = event.sender.id;
  recordingState.delete(webContentsId);
});
