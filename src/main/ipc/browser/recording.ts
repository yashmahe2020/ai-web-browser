import { ipcMain, app } from "electron";
import fs from "fs/promises";
import path from "path";
import { ListenersManager } from "@/ipc/listeners-manager";

const listenersManager = new ListenersManager();

// Store recording state per window
const recordingState = new Map<number, boolean>();

ipcMain.handle("recording:is-recording", async (event) => {
  const webContentsId = event.sender.id;
  return recordingState.get(webContentsId) ?? false;
});

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

ipcMain.on("recording:state-changed", (event, isRecording: boolean) => {
  const webContentsId = event.sender.id;
  recordingState.set(webContentsId, isRecording);

  // Notify all listeners in the same window
  listenersManager.sendToWebContents(
    webContentsId,
    "recording:on-state-changed",
    isRecording
  );
});

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

// Clean up state when window is closed
ipcMain.on("recording:cleanup", (event) => {
  const webContentsId = event.sender.id;
  recordingState.delete(webContentsId);
});
