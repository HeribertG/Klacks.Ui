// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source for the stacking order and edge anchoring of every floating overlay.
 * Before this table the values lived in four places (styles.scss, toast.component.ts host,
 * assistant-panels.component.scss, voice-shell.component.scss) and one of them was inert:
 * the toast container opens its own stacking context, so the z-index set on the interactive
 * toast inside it never competed with anything outside.
 */

/**
 * Stacking order, lowest first. Only the outage overlay may cover the rail: it reports that the
 * backend is gone, which makes every action behind it meaningless.
 */
export const OVERLAY_Z_INDEX = {
  /** Global spinner and the voice transcript both sit here and must stay below the rail. */
  Blocking: 999,
  VoiceShell: 1000,
  Rail: 1200,
  BackendOutage: 2000,
} as const;

/**
 * Edge anchoring. On wide screens the voice bubble anchors to the edge of the centred content
 * container rather than the viewport, so the rail has to use the same formula or the two drift
 * apart by over 200px on a 1920 screen.
 */
export const OVERLAY_ANCHOR = {
  EdgeGapPx: 16,
  /** Width of the centred page container the bubble anchors to. */
  ContentContainerPx: 1445,
  /** Below this the bubble falls back to the viewport edge. */
  ContainerAnchorMinWidthPx: 1025,
  /** Width of the docked aside panel (aside.component.scss). */
  AsidePanelPx: 450,
  /** Gap kept between the rail and the docked aside panel. */
  AsideGapPx: 20,
} as const;

/**
 * Zones in render order. A zone's existence may only change with the output mode, never with its
 * content: a zone that appears and disappears as items arrive moves everything after it, which is
 * how the old layout produced clicks on the wrong control.
 */
export const OVERLAY_ZONE = {
  /** Waits for a decision. Never scrolls, always first. */
  Interrupt: 'interrupt',
  /** Autohide messages. Appended after the interrupt so they never displace it. */
  Transient: 'transient',
  /** Ambient assistant state. The only zone allowed to scroll. */
  Persistent: 'persistent',
} as const;

export type OverlayZone = (typeof OVERLAY_ZONE)[keyof typeof OVERLAY_ZONE];
