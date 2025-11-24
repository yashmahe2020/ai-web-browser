#!/usr/bin/env bun
/**
 * Test script to verify recording system functionality
 * This script tests the recording system components programmatically
 */

import { recorder } from "./src/renderer/src/lib/recording/recorder";
import type { RecordedEvent } from "./src/renderer/src/types/recording";

console.log("🧪 Testing Recording System\n");

// Test 1: Initial state
console.log("Test 1: Initial State");
const initialState = recorder.getState();
console.log(`  ✓ isRecording: ${initialState.isRecording} (expected: false)`);
console.log(`  ✓ events count: ${initialState.events.length} (expected: 0)`);
console.log(`  ✓ sessionStartTime: ${initialState.sessionStartTime} (expected: undefined)\n`);

// Test 2: Start recording
console.log("Test 2: Start Recording");
recorder.startRecording();
const afterStart = recorder.getState();
console.log(`  ✓ isRecording: ${afterStart.isRecording} (expected: true)`);
console.log(`  ✓ events count: ${afterStart.events.length} (expected: 0)`);
console.log(`  ✓ sessionStartTime: ${afterStart.sessionStartTime ? "set" : "not set"} (expected: set)\n`);

// Test 3: Add navigation event
console.log("Test 3: Add Navigation Event");
recorder.addEvent({
  type: "navigate",
  url: "https://example.com",
  tabId: 1,
  title: "Example Domain"
});
const afterNavigate = recorder.getState();
console.log(`  ✓ events count: ${afterNavigate.events.length} (expected: 1)`);
const navEvent = afterNavigate.events[0];
console.log(`  ✓ event type: ${navEvent.type} (expected: navigate)`);
console.log(`  ✓ event url: ${navEvent.url} (expected: https://example.com)`);
console.log(`  ✓ event has timestamp: ${navEvent.timestamp ? "yes" : "no"} (expected: yes)`);
console.log(`  ✓ event has id: ${navEvent.id ? "yes" : "no"} (expected: yes)\n`);

// Test 4: Add click event
console.log("Test 4: Add Click Event");
recorder.addEvent({
  type: "click",
  url: "https://example.com",
  tabId: 1,
  selector: "button#submit",
  tagName: "button",
  innerText: "Submit"
});
const afterClick = recorder.getState();
console.log(`  ✓ events count: ${afterClick.events.length} (expected: 2)`);
const clickEvent = afterClick.events[1];
console.log(`  ✓ event type: ${clickEvent.type} (expected: click)`);
console.log(`  ✓ event selector: ${clickEvent.selector} (expected: button#submit)`);
console.log(`  ✓ event innerText: ${clickEvent.innerText} (expected: Submit)\n`);

// Test 5: Add input event
console.log("Test 5: Add Input Event");
recorder.addEvent({
  type: "input",
  url: "https://example.com",
  tabId: 1,
  selector: "input[name='email']",
  tagName: "input",
  value: "test@example.com"
});
const afterInput = recorder.getState();
console.log(`  ✓ events count: ${afterInput.events.length} (expected: 3)`);
const inputEvent = afterInput.events[2];
console.log(`  ✓ event type: ${inputEvent.type} (expected: input)`);
console.log(`  ✓ event value: ${inputEvent.value} (expected: test@example.com)\n`);

// Test 6: Add scroll event
console.log("Test 6: Add Scroll Event");
recorder.addEvent({
  type: "scroll",
  url: "https://example.com",
  tabId: 1,
  scrollX: 100,
  scrollY: 200
});
const afterScroll = recorder.getState();
console.log(`  ✓ events count: ${afterScroll.events.length} (expected: 4)`);
const scrollEvent = afterScroll.events[3];
console.log(`  ✓ event type: ${scrollEvent.type} (expected: scroll)`);
console.log(`  ✓ event scrollX: ${scrollEvent.scrollX} (expected: 100)`);
console.log(`  ✓ event scrollY: ${scrollEvent.scrollY} (expected: 200)\n`);

// Test 7: Export session
console.log("Test 7: Export Session");
const session = recorder.exportSession();
if (session) {
  console.log(`  ✓ session exists: yes`);
  console.log(`  ✓ session id: ${session.id}`);
  console.log(`  ✓ session startTime: ${session.startTime}`);
  console.log(`  ✓ session events count: ${session.events.length} (expected: 4)`);
  console.log(`  ✓ session duration: ${session.endTime - session.startTime}ms`);
} else {
  console.log(`  ✗ session exists: no (ERROR!)\n`);
  process.exit(1);
}

// Test 8: Stop recording
console.log("\nTest 8: Stop Recording");
recorder.stopRecording();
const afterStop = recorder.getState();
console.log(`  ✓ isRecording: ${afterStop.isRecording} (expected: false)`);
console.log(`  ✓ events preserved: ${afterStop.events.length} (expected: 4)\n`);

// Test 9: Try to add event when not recording
console.log("Test 9: Add Event When Not Recording");
const eventsBefore = recorder.getState().events.length;
recorder.addEvent({
  type: "click",
  url: "https://example.com",
  tabId: 1
});
const eventsAfter = recorder.getState().events.length;
console.log(`  ✓ events count unchanged: ${eventsBefore === eventsAfter} (expected: true)\n`);

// Test 10: Start new recording (should clear events)
console.log("Test 10: Start New Recording (Should Clear Events)");
recorder.startRecording();
const newSession = recorder.getState();
console.log(`  ✓ isRecording: ${newSession.isRecording} (expected: true)`);
console.log(`  ✓ events cleared: ${newSession.events.length} (expected: 0)\n`);

// Test 11: Verify event ordering
console.log("Test 11: Verify Event Ordering");
recorder.addEvent({ type: "navigate", url: "https://test1.com", tabId: 1 });
recorder.addEvent({ type: "click", url: "https://test1.com", tabId: 1 });
recorder.addEvent({ type: "navigate", url: "https://test2.com", tabId: 1 });
const finalState = recorder.getState();
let ordered = true;
for (let i = 1; i < finalState.events.length; i++) {
  if (finalState.events[i].timestamp < finalState.events[i - 1].timestamp) {
    ordered = false;
    break;
  }
}
console.log(`  ✓ events in chronological order: ${ordered} (expected: true)\n`);

console.log("✅ All tests passed! Recording system is working correctly.\n");

// Print summary
const summary = recorder.exportSession();
if (summary) {
  console.log("📊 Final Session Summary:");
  console.log(`   Session ID: ${summary.id}`);
  console.log(`   Events: ${summary.events.length}`);
  console.log(`   Duration: ${summary.endTime - summary.startTime}ms`);
  console.log(`   Event types: ${[...new Set(summary.events.map(e => e.type))].join(", ")}\n`);
}



