// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAppContactSettings } from './app-contact-settings.interface';

export class AppContactSettings implements IAppContactSettings {
  name = '';
  addressName = '';
  supplementAddress = '';
  address = '';
  zip = '';
  place = '';
  state = '';
  country = '';
  timeZone = '';
  phone = '';
  email = '';
  accountingStart = 0;
  mark = '';
  globalCalendarCountry = '';
  globalCalendarState = '';
  globalCalendarSelectionId = '';
}
