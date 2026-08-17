// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tracks the expand/collapse state of the edit-address cards so the quick-print
 * PDF can mirror exactly what is currently visible on screen.
 * @param key - Card identifier, see EditAddressCardKey
 * @param isExpanded - Whether the card is currently expanded on screen
 */

import { Injectable, signal } from '@angular/core';

export const EDIT_ADDRESS_CARD_KEYS = {
  Persona: 'persona',
  Membership: 'membership',
  Contracts: 'contracts',
  Groups: 'groups',
  Qualifications: 'qualifications',
  Note: 'note',
  Image: 'image',
} as const;

export type EditAddressCardKey = typeof EDIT_ADDRESS_CARD_KEYS[keyof typeof EDIT_ADDRESS_CARD_KEYS];

@Injectable({ providedIn: 'root' })
export class EditAddressCardVisibilityService {
  private readonly expandedState = signal<Record<string, boolean>>({});

  setExpanded(key: EditAddressCardKey, isExpanded: boolean): void {
    this.expandedState.update(current => ({ ...current, [key]: isExpanded }));
  }

  snapshot(): Record<string, boolean> {
    return this.expandedState();
  }
}
