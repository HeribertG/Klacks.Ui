// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Frontend default values for the global ERP import cron schedule.
 * Mirrors Klacks.Api/Domain/Constants/ErpImportSettingsTypes.cs so both layers agree on defaults.
 */
export class ErpImportScheduleDefaults {
  static readonly CronExpression = '0 * * * *';
  static readonly CronTimeZone = 'Europe/Zurich';
}
