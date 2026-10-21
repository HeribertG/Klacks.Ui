// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared types and constants for the qualification icon bubbles drawn in the schedule
 * row headers (employee row header and shift row header). Single source of truth for the
 * bubble sizing, rendering and tooltip logic so both row headers stay in sync.
 */
import { QualificationBubbleSlot } from './qualification-bubble-slot.interface';

export const QUALIFICATION_BUBBLE_BASE_DIAMETER = 16;
export const QUALIFICATION_BUBBLE_OVERLAP_RATIO = 0.66;
export const QUALIFICATION_BUBBLE_EMOJI_RATIO = 0.7;
export const QUALIFICATION_BUBBLE_MIN_DIAMETER = 6;

const SMALL_ZOOM_THRESHOLD = 0.8;
const SMALL_ZOOM_MAX_SLOTS = 3;
const LARGE_ZOOM_MAX_SLOTS = 6;

/**
 * Maximum number of bubble slots (including the overflow slot) that may be shown.
 * Capped harder at small zoom so the tiny circles never become an unreadable smear.
 */
export function maxQualificationBubbleSlots(zoom: number): number {
  return zoom < SMALL_ZOOM_THRESHOLD ? SMALL_ZOOM_MAX_SLOTS : LARGE_ZOOM_MAX_SLOTS;
}

/** A bubble slot with its resolved cell-local centre and diameter. */
export interface QualificationBubble extends QualificationBubbleSlot {
  cx: number;
  cy: number;
  d: number;
}
