// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure helper for sorting container template items chronologically.
 * Handles midnight-crossing containers where items after container start time come first.
 * @param items - The items to sort (not mutated)
 * @param containerTimeFrom - Container start time in HH:mm or HH:mm:ss format
 * @param containerTimeUntil - Container end time in HH:mm or HH:mm:ss format
 */
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';

function parseTimeToMinutes(time: string | undefined | null): number {
  return time ? timeToMinutes(time) : 0;
}

function getItemStartMinutes(item: IContainerTemplateItem): number {
  const time = item.absenceId
    ? item.startItem
    : (item.timeRangeStartItem || item.startItem);
  return parseTimeToMinutes(time);
}

export function sortContainerItemsChronologically(
  items: IContainerTemplateItem[],
  containerTimeFrom: string,
  containerTimeUntil: string,
): IContainerTemplateItem[] {
  const startMinutes = parseTimeToMinutes(containerTimeFrom);
  const endMinutes = parseTimeToMinutes(containerTimeUntil);
  const crossesMidnight = endMinutes < startMinutes;

  const copy = [...items];

  if (!crossesMidnight) {
    return copy.sort((a, b) => getItemStartMinutes(a) - getItemStartMinutes(b));
  }

  return copy.sort((a, b) => {
    const startA = getItemStartMinutes(a);
    const startB = getItemStartMinutes(b);
    const keyA = startA >= startMinutes ? 0 : 1;
    const keyB = startB >= startMinutes ? 0 : 1;
    if (keyA !== keyB) return keyA - keyB;
    return startA - startB;
  });
}
