// Manage listeners for IPC channels on the renderer process
// Make sure messages are not wasted by sending to renderer processes that are not listening

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ipcMain, WebContents } from "electron";

type ListenerMap = Map<string, [WebContents, () => void]>;

const listeners = new Map<string, ListenerMap>();
// Track destroyed listeners per WebContents to avoid MaxListenersExceededWarning
const webContentsDestroyedListeners = new Map<WebContents, () => void>();

// Utility Functions //
function getConnectedWebContents(channel: string) {
  const webContentsSet = new Set<WebContents>();

  const channelListeners = listeners.get(channel);
  if (!channelListeners) return webContentsSet;

  for (const [, [webContents]] of channelListeners) {
    webContentsSet.add(webContents);
  }

  return webContentsSet;
}

function sendMessageToWebContents(webContents: WebContents, channel: string, ...args: any[]) {
  if (webContents.isDestroyed()) {
    return false;
  }
  webContents.send(channel, ...args);
  return true;
}

// Public Functions //
export function sendMessageToListeners(channel: string, ...args: any[]) {
  const webContentsSet = getConnectedWebContents(channel);

  for (const webContents of webContentsSet) {
    if (webContents.isDestroyed()) {
      continue;
    }
    sendMessageToWebContents(webContents, channel, ...args);
  }
}

export function sendMessageToListenersWithWebContents(
  selectedWebContents: WebContents[],
  channel: string,
  ...args: any[]
) {
  const webContentsSet = getConnectedWebContents(channel);

  for (const webContents of selectedWebContents) {
    if (webContents.isDestroyed()) {
      continue;
    }
    if (webContentsSet.has(webContents)) {
      sendMessageToWebContents(webContents, channel, ...args);
    }
  }
}

// Internal Functions //
function addListener(channel: string, listenerId: string, webContents: WebContents) {
  const channelListeners: ListenerMap = listeners.get(channel) || new Map();

  // Set max listeners to prevent warning (we may have many listeners per WebContents)
  if (webContents.listenerCount("destroyed") === 0) {
    webContents.setMaxListeners(100);
  }

  // Use a single destroyed listener per WebContents to avoid MaxListenersExceededWarning
  if (!webContentsDestroyedListeners.has(webContents)) {
    const onDestroyed = () => {
      // Clean up all listeners for this WebContents
      for (const [ch, channelListenersMap] of listeners.entries()) {
        for (const [lid, [wc, cleanup]] of channelListenersMap.entries()) {
          if (wc === webContents) {
            cleanup();
            channelListenersMap.delete(lid);
          }
        }
        if (channelListenersMap.size === 0) {
          listeners.delete(ch);
        }
      }
      webContentsDestroyedListeners.delete(webContents);
    };
    webContents.on("destroyed", onDestroyed);
    webContentsDestroyedListeners.set(webContents, onDestroyed);
  }

  const removeCallback = () => {
    // Individual cleanup - the destroyed listener will handle bulk cleanup
    // This is kept for manual removal via listeners:remove
  };

  channelListeners.set(listenerId, [webContents, removeCallback]);
  listeners.set(channel, channelListeners);
}

function removeListener(channel: string, listenerId: string) {
  const channelListeners = listeners.get(channel);
  if (!channelListeners) return;

  const data = channelListeners.get(listenerId);
  if (data) {
    const [webContents, removeCallback] = data;
    removeCallback();
    channelListeners.delete(listenerId);
    
    // If this was the last listener for this channel, clean up
    if (channelListeners.size === 0) {
      listeners.delete(channel);
    } else {
      listeners.set(channel, channelListeners);
    }
    
    // Check if this WebContents has any remaining listeners
    let hasRemainingListeners = false;
    for (const chListeners of listeners.values()) {
      for (const [, [wc]] of chListeners.entries()) {
        if (wc === webContents) {
          hasRemainingListeners = true;
          break;
        }
      }
      if (hasRemainingListeners) break;
    }
    
    // If no remaining listeners, we could remove the destroyed listener,
    // but it's safer to keep it in case new listeners are added
  }
}

ipcMain.on("listeners:add", (event, channel: string, listenerId: string) => {
  const webContents = event.sender;
  addListener(channel, listenerId, webContents);
});

ipcMain.on("listeners:remove", (_event, channel: string, listenerId: string) => {
  removeListener(channel, listenerId);
});
