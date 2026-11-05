// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure rules for the three stored availability states of a client hour (true = can work, false = blocked,
 * undefined = no entry) and how they are displayed under the day rule: once a day has at least one available
 * hour, every hour of that day without an entry is blocked as well and drawn exactly like an explicit block.
 * Also defines the click cycle of a cell group, driven by the visible state so every click changes the picture:
 * empty -> available; mixed -> available; blocked -> available on a day with a check, otherwise -> empty;
 * available -> no entry while another hour of the day stays available (blocked by the day rule), otherwise -> false.
 * @param stored - Stored state of one hour; undefined means the hour has no entry
 * @param storedStates - Stored states of all hours of one cell group
 * @param dayHasAvailableHour - Whether the client has at least one available hour on that day
 * @param hasAvailableHourOutsideGroup - Whether the day keeps an available hour outside the clicked group
 * @param startHour - First hour of a cell group; the stored states follow it hour by hour
 * @param hourStates - Display state of every hour of a cell group, as used for the tooltip of a mixed cell
 * @param labelFor - Returns the translated label of a display state
 */

import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { StoredAvailability } from 'src/app/domain/models/client-availability/stored-availability.type';
import { IAvailabilityHourDisplayState } from 'src/app/domain/models/client-availability/availability-hour-display-state.interface';
import { hoursToHHMM } from 'src/app/domain/helpers/time-format.helper';

const HOUR_LINE_SEPARATOR = '\n';

export function resolveHourDisplayState(
  stored: StoredAvailability,
  dayHasAvailableHour: boolean,
): AvailabilityDisplayState {
  if (stored === true) {
    return AvailabilityDisplayState.Available;
  }
  if (stored === false || dayHasAvailableHour) {
    return AvailabilityDisplayState.Blocked;
  }
  return AvailabilityDisplayState.Empty;
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

export function resolveGroupHourDisplayStates(
  startHour: number,
  storedStates: readonly StoredAvailability[],
  dayHasAvailableHour: boolean,
): IAvailabilityHourDisplayState[] {
  return storedStates.map((stored, index) => ({
    hour: startHour + index,
    state: resolveHourDisplayState(stored, dayHasAvailableHour),
  }));
}

export function formatGroupHourStates(
  hourStates: readonly IAvailabilityHourDisplayState[],
  labelFor: (state: AvailabilityDisplayState) => string,
): string {
  return hourStates
    .map((hourState) => `${hoursToHHMM(hourState.hour)} ${labelFor(hourState.state)}`)
    .join(HOUR_LINE_SEPARATOR);
}

export function nextGroupStoredValue(
  storedStates: readonly StoredAvailability[],
  hasAvailableHourOutsideGroup: boolean,
): boolean | null {
  const dayHasAvailableHour = hasAvailableHourOutsideGroup || storedStates.some((stored) => stored === true);
  switch (resolveGroupDisplayState(storedStates, dayHasAvailableHour)) {
    case AvailabilityDisplayState.Available:
      return hasAvailableHourOutsideGroup ? null : false;
    case AvailabilityDisplayState.Blocked:
      return hasAvailableHourOutsideGroup ? true : null;
    default:
      return true;
  }
}
