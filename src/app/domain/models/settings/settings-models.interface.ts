// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAppContactSettings } from 'src/app/domain/models/settings/app-contact-settings.interface';
import { IEmailServerSettings } from 'src/app/domain/models/settings/email-server-settings.interface';
import { IImapServerSettings } from 'src/app/domain/models/settings/imap-server-settings.interface';
import { IWorkSettings } from 'src/app/domain/models/settings/work-settings.interface';
import { ISchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.interface';
import { IDataRetentionSettings } from 'src/app/domain/models/settings/data-retention-settings.interface';
import { IUpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.interface';
import { ISpeechSettings } from 'src/app/domain/models/settings/speech-settings.interface';
import { IHolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.interface';
import { ICompensatoryRestSettings } from 'src/app/domain/models/settings/compensatory-rest-settings.interface';
import { ISurchargeModeSettings } from 'src/app/domain/models/settings/surcharge-mode-settings.interface';
import { IOvertimeSettings } from 'src/app/domain/models/settings/overtime-settings.interface';
import {
  IComplianceEnforcementSettings,
} from 'src/app/domain/models/settings/compliance-enforcement-settings.interface';
import { IActiveIndustriesSettings } from 'src/app/domain/models/settings/active-industries-settings.interface';

export interface SettingsModels {
  contact: IAppContactSettings;
  email: IEmailServerSettings;
  imap: IImapServerSettings;
  work: IWorkSettings;
  schedulingDefaults: ISchedulingDefaultSettings;
  dataRetention: IDataRetentionSettings;
  update: IUpdateConfigSettings;
  openRouteServiceApiKey: string;
  deeplApiKey: string;
  webSearchProvider: string;
  webSearchApiKey: string;
  webSearchMaxResults: string;
  erpImportCronExpression: string;
  erpImportCronTimeZone: string;
  speech: ISpeechSettings;
  holisticHarmonizer: IHolisticHarmonizerSettings;
  compensatoryRest: ICompensatoryRestSettings;
  surchargeMode: ISurchargeModeSettings;
  overtime: IOvertimeSettings;
  complianceEnforcement: IComplianceEnforcementSettings;
  activeIndustries: IActiveIndustriesSettings;
}
