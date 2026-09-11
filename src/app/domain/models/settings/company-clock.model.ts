// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wire model for the CompanyClock endpoint: the company's IANA time zone, its current calendar
 * date, and which step of the backend resolution chain (setting, address country, calendar
 * country, or UTC fallback) produced the time zone.
 */

export type CompanyClockSource = 'Setting' | 'AddressCountry' | 'CalendarCountry' | 'Utc';

export const COMPANY_CLOCK_SOURCE_UTC: CompanyClockSource = 'Utc';

export interface ICompanyClockResource {
  timeZone: string;
  today: string;
  source: CompanyClockSource;
}
