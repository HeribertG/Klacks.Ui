// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Timing, distance and sizing constants for touch and pen interaction on canvas grids and menus.
 * PreventDefaultOnPointerDown and SuppressCompatibilityMouseEvents encode assumptions about the
 * compatibility mouse events a browser emits after a touch pointerdown. Those assumptions can only
 * be confirmed on a real tablet, so they live here as flags and are read at exactly one call site
 * each, which makes correcting them after the device measurement a single change.
 */

export class TouchInteraction {
  public static readonly LongPressMs = 500;
  public static readonly MoveTolerancePx = 10;
  public static readonly SuppressAfterLongPressMs = 700;
  public static readonly GhostClickGuardMs = 300;
  public static readonly MinTargetPx = 44;
  public static readonly MenuOffsetFromFingerPx = 24;
  public static readonly TooltipAutoHideMs = 3000;
  public static readonly RowDragTouchStartDelayMs = 1000;
  public static readonly FillHandleHitAreaPx = 12;
  public static readonly FillHandleTouchHitAreaPx = 22;
  public static readonly BreakAnchorTouchHitAreaPx = 22;
  public static readonly PreventDefaultOnPointerDown = true;
  public static readonly SuppressCompatibilityMouseEvents = false;
}

export const TOUCH_LIKE_POINTER_TYPES: ReadonlySet<string> = new Set(['touch', 'pen']);

export const MOUSE_POINTER_TYPE = 'mouse';

export const TOUCH_POINTER_TYPE = 'touch';

export const PEN_POINTER_TYPE = 'pen';
