// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Creates and compares the typed settings groups that the app settings store keeps per GeneralSettings key family.
 * @param current - The settings groups as currently edited
 * @param original - The settings groups as last loaded or saved
 */

import { SettingsModels } from 'src/app/domain/models/settings/settings-models.interface';
import { AppContactSettings } from 'src/app/domain/models/settings/app-settings.model';
import { EmailServerSettings } from 'src/app/domain/models/settings/email-server-settings.model';
import { ImapServerSettings } from 'src/app/domain/models/settings/imap-server-settings.model';
import { WorkSettings } from 'src/app/domain/models/settings/work-settings.model';
import { SchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.model';
import { DataRetentionSettings } from 'src/app/domain/models/settings/data-retention-settings.model';
import { UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { HolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.model';
import { CompensatoryRestSettings } from 'src/app/domain/models/settings/compensatory-rest-settings.model';
import { SurchargeModeSettings } from 'src/app/domain/models/settings/surcharge-mode-settings.model';
import { OvertimeSettings } from 'src/app/domain/models/settings/overtime-settings.model';
import { ComplianceEnforcementSettings } from 'src/app/domain/models/settings/compliance-enforcement-settings.model';
import { ActiveIndustriesSettings } from 'src/app/domain/models/settings/active-industries-settings.model';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { compareComplexObjects } from 'src/app/domain/helpers/object.helper';

/**
 * Returns a fresh set of settings groups holding the defaults used when a key is not stored.
 * @returns New group instances, never shared between calls
 */
export function createDefaultSettingsModels(): SettingsModels {
  return {
    contact: new AppContactSettings(),
    email: new EmailServerSettings(),
    imap: new ImapServerSettings(),
    work: new WorkSettings(),
    schedulingDefaults: new SchedulingDefaultSettings(),
    dataRetention: new DataRetentionSettings(),
    update: new UpdateConfigSettings(),
    openRouteServiceApiKey: '',
    deeplApiKey: '',
    webSearchProvider: '',
    webSearchApiKey: '',
    webSearchMaxResults: '',
    erpImportCronExpression: ErpImportScheduleDefaults.CronExpression,
    erpImportCronTimeZone: ErpImportScheduleDefaults.UseCompanyTimeZone,
    speech: new SpeechSettings(),
    holisticHarmonizer: new HolisticHarmonizerSettings(),
    compensatoryRest: new CompensatoryRestSettings(),
    surchargeMode: new SurchargeModeSettings(),
    overtime: new OvertimeSettings(),
    complianceEnforcement: new ComplianceEnforcementSettings(),
    activeIndustries: new ActiveIndustriesSettings(),
  };
}

/**
 * Compares two sets of settings groups: plain string settings by value, groups property by property.
 * @param current - The settings groups as currently edited
 * @param original - The settings groups as last loaded or saved
 * @returns True when no group differs
 */
export function areSettingsModelsEqual(current: SettingsModels, original: SettingsModels): boolean {
  return (Object.keys(current) as (keyof SettingsModels)[]).every((key) => {
    const currentValue = current[key];
    const originalValue = original[key];
    return typeof currentValue === 'string'
      ? currentValue === originalValue
      : compareComplexObjects(currentValue, originalValue);
  });
}
