// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects whether a mouse event is a secondary (context) click, including the macOS Ctrl+Click
 * that Safari/WebKit reports as a primary-button mousedown before dispatching contextmenu.
 * @param event - The mouse event to classify
 */

const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;
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
