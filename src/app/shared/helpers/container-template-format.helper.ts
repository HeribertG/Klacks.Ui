// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure formatting and conversion helpers for container template items.
 * @param formatClientWithAddress - Formats client name with customer address for display/PDF
 * @param formatWorkTime - Formats decimal work hours to "H:MM" string
 * @param convertShiftToContainerTemplateItem - Converts an IShift to an IContainerTemplateItem
 */
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  IContainerTemplateItem,
} from 'src/app/domain/models/container/container-template-class';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import { newGuid } from './guid.helper';

const MINUTES_PER_HOUR = 60;

export function formatClientWithAddress(item: IShift | IContainerTemplateItem): string {
  const shift = 'containerTemplateId' in item || 'tmpId' in item
    ? (item as IContainerTemplateItem).shift
    : (item as IShift);

  if (!shift?.client) {
    return '-';
  }

  const client = shift.client;
  const displayName = client.name || client.company || '-';

  const address =
    client.addresses?.find((addr) => addr.type === AddressTypeEnum.customer) ??
    client.addresses?.[0];

  if (!address) {
    return displayName;
  }

  const addressParts = [address.street, address.zip, address.city].filter(
    (part) => part && part.trim() !== '',
  );

  const addressString = addressParts.join(', ');
  return addressString ? `${displayName}: ${addressString}` : displayName;
}

export function formatWorkTime(workTime: number): string {
  const hours = Math.floor(workTime);
  const minutes = Math.round((workTime - hours) * MINUTES_PER_HOUR);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function convertShiftToContainerTemplateItem(
  shift: IShift,
): IContainerTemplateItem {
  return {
    tmpId: newGuid(),
    shiftId: shift.id!,
    shift: shift,
    startItem: shift.startShift,
    endItem: shift.endShift,
    briefingTime: shift.briefingTime,
    debriefingTime: shift.debriefingTime,
    travelTimeAfter: shift.travelTimeAfter,
    travelTimeBefore: shift.travelTimeBefore,
    timeRangeStartItem: shift.isTimeRange ? shift.startShift : '',
    timeRangeEndItem: shift.isTimeRange ? shift.endShift : '',
  };
}
