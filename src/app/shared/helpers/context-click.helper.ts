// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects whether a mouse event is a secondary (context) click, including the macOS Ctrl+Click
 * that Safari/WebKit reports as a primary-button mousedown before dispatching contextmenu, and
 * classifies pointer events as finger/pen input or as a secondary pointer (pen barrel button).
 * @param event - The mouse or pointer event to classify
 */
import {
  PEN_POINTER_TYPE,
  TOUCH_LIKE_POINTER_TYPES,
} from 'src/app/domain/constants/touch-interaction.constants';

const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;
const SECONDARY_BUTTON_MASK = 2;
const MAC_PLATFORM_PATTERN = /mac/i;

interface NavigatorWithUserAgentData {
  userAgentData?: { platform?: string };
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as unknown as NavigatorWithUserAgentData).userAgentData?.platform ||
    navigator.platform ||
    '';
  return MAC_PLATFORM_PATTERN.test(platform);
}

export function isMacContextClick(event: MouseEvent): boolean {
  if (event.button === SECONDARY_BUTTON) return true;
  return isMacPlatform() && event.ctrlKey && event.button === PRIMARY_BUTTON;
}

export function isTouchLikePointer(event: PointerEvent): boolean {
  return TOUCH_LIKE_POINTER_TYPES.has(event.pointerType);
}

export function isSecondaryPointer(event: PointerEvent): boolean {
  if (isMacContextClick(event)) return true;
  return (
    event.pointerType === PEN_POINTER_TYPE &&
    (event.buttons & SECONDARY_BUTTON_MASK) !== 0
  );
}
