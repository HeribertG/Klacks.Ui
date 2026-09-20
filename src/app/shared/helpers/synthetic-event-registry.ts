// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Keeps track of the events the touch directives dispatch themselves, so a suppression window that
 * swallows the browser's trailing compatibility events never swallows a replayed gesture. Identity
 * is used instead of `isTrusted` because end-to-end tests dispatch untrusted events that must be
 * treated exactly like the browser's own ones.
 * @param event - Event instance to register as self-dispatched or to ask about
 */
const selfDispatchedEvents = new WeakSet<Event>();

export function markSyntheticEvent<T extends Event>(event: T): T {
  selfDispatchedEvents.add(event);
  return event;
}

export function isSyntheticEvent(event: Event): boolean {
  return selfDispatchedEvents.has(event);
}
