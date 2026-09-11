// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Frontend default values for the global ERP import cron schedule.
 * CronExpression mirrors Klacks.Api/Domain/Constants/ErpImportSettingsTypes.cs so both layers
 * agree on the default cadence. UseCompanyTimeZone is the sentinel stored (and shown as an empty
 * selection) when no explicit cron time zone was chosen, meaning the schedule follows the
 * resolved company time zone (CompanyClockService) instead of a hardcoded zone.
 */
export class ErpImportScheduleDefaults {
  static readonly CronExpression = '0 * * * *';
  static readonly UseCompanyTimeZone = '';
}
