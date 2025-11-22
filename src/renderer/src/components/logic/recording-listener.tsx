import { useEffect, useRef } from "react";
import { useTabs } from "@/components/providers/tabs-provider";
import { recorder } from "@/lib/recording/recorder";
import { useRecording } from "@/components/providers/recording-provider";

/**
 * RecordingListener component that hooks into tab navigation events
 * and records them when recording is enabled.
 */
export function RecordingListener() {
  const { focusedTab, tabsData } = useTabs();
  const { isRecording } = useRecording();

  // Track previous tab state to detect changes
  const prevFocusedTabRef = useRef<{ id: number; url: string } | null>(null);
  const prevTabCountRef = useRef(0);

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

  // Track new tabs being created (increase in tab count)
  useEffect(() => {
    if (!isRecording || !tabsData) {
      prevTabCountRef.current = tabsData?.tabs.length || 0;
      return;
    }

    const currentTabCount = tabsData.tabs.length;
    const prevTabCount = prevTabCountRef.current;

    if (currentTabCount > prevTabCount) {
      // New tab(s) created
      const newTabs = tabsData.tabs.slice(prevTabCount);
      newTabs.forEach((tab) => {
        recorder.addEvent({
          type: "tab_created",
          url: tab.url,
          tabId: tab.id,
          title: tab.title
        });
      });
    }

    prevTabCountRef.current = currentTabCount;
  }, [tabsData?.tabs.length, isRecording, tabsData]);

  // This component doesn't render anything
  return null;
}
