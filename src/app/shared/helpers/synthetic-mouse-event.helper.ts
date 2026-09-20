// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds a synthetic MouseEvent that mirrors the position and modifier keys of a pointer event so
 * the existing mouse handlers of the canvas grids can be replayed for touch gestures. The result
 * always carries `isTrusted === false`, so no browser default action (focus, text selection) runs.
 * Every created event is registered as self-dispatched so the long-press suppression window lets it
 * pass instead of mistaking it for a trailing compatibility event of the browser.
 * @param type - Mouse event type to create (mousemove, mousedown, mouseup)
 * @param source - Pointer event supplying clientX/clientY, screen coordinates and modifier keys
 * @param buttons - Value of the `buttons` bitmask on the synthetic event
 */
import { markSyntheticEvent } from './synthetic-event-registry';

const PRIMARY_BUTTON = 0;

export function createSyntheticMouseEvent(
  type: string,
  source: PointerEvent,
  buttons: number,
): MouseEvent {
  return markSyntheticEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: PRIMARY_BUTTON,
    buttons,
    clientX: source.clientX,
    clientY: source.clientY,
    screenX: source.screenX,
    screenY: source.screenY,
    ctrlKey: source.ctrlKey,
    shiftKey: source.shiftKey,
    altKey: source.altKey,
    metaKey: source.metaKey,
  }));
}
