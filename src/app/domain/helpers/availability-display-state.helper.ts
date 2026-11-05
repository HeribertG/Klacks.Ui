// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure rules for the three stored availability states of a client hour (true = can work, false = blocked,
 * undefined = no entry) and how they are displayed under the day rule: once a day has at least one available
 * hour, every hour of that day without an entry is blocked as well (drawn as a weaker, derived cross).
 * Also defines the click cycle of a cell group: empty -> available -> blocked -> empty, mixed -> available.
 * @param stored - Stored state of one hour; undefined means the hour has no entry
 * @param storedStates - Stored states of all hours of one cell group
 * @param dayHasAvailableHour - Whether the client has at least one available hour on that day
 */

import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { StoredAvailability } from 'src/app/domain/models/client-availability/stored-availability.type';

export function resolveHourDisplayState(
  stored: StoredAvailability,
  dayHasAvailableHour: boolean,
): AvailabilityDisplayState {
  if (stored === true) {
    return AvailabilityDisplayState.Available;
  }
  if (stored === false) {
    return AvailabilityDisplayState.Blocked;
  }
  return dayHasAvailableHour ? AvailabilityDisplayState.DerivedBlocked : AvailabilityDisplayState.Empty;
}

export function resolveGroupDisplayState(
  storedStates: readonly StoredAvailability[],
  dayHasAvailableHour: boolean,
): AvailabilityDisplayState {
  if (storedStates.length === 0) {
    return AvailabilityDisplayState.Empty;
  }
  const first = resolveHourDisplayState(storedStates[0], dayHasAvailableHour);
  for (const stored of storedStates) {
    if (resolveHourDisplayState(stored, dayHasAvailableHour) !== first) {
      return AvailabilityDisplayState.Mixed;
    }
  }
  return first;
}

export function nextGroupStoredValue(storedStates: readonly StoredAvailability[]): boolean | null {
  if (storedStates.every((stored) => stored === undefined)) {
    return true;
  }
  if (storedStates.every((stored) => stored === true)) {
    return false;
  }
  if (storedStates.every((stored) => stored === false)) {
    return null;
  }
  return true;
}
