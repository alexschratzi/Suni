// src/utils/calendarSyncEvents.ts

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to "iCal changed" events.
 * Returns an unsubscribe function.
 */
export function subscribeICalChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners that iCal subscriptions have changed
 * (create / update / delete).
 */
export function notifyICalChanged() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("Error in iCal changed listener:", e);
    }
  });
}
