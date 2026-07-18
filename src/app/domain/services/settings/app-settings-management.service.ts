// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central store for all key-value application settings persisted through the generic
 * GeneralSettings endpoint. Loads the flat setting list into strongly typed sub-group
 * signals (contact, email, imap, work, scheduling defaults, on-call, compensatory rest,
 * surcharge modes, overtime, compliance enforcement, etc.), tracks per-group dirtiness
 * against an original snapshot, and debounces an auto-save that writes only changed keys.
 */

import { Injectable, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting, Setting, AppSetting } from 'src/app/domain/models/settings/settings-various-class';
import {
  IAppContactSettings,
  IEmailServerSettings,
  IImapServerSettings,
  IWorkSettings,
  ISchedulingDefaultSettings,
  IDataRetentionSettings,
  IOnCallSettings,
  ICompensatoryRestSettings,
  ISurchargeModeSettings,
  IOvertimeSettings,
  IComplianceEnforcementSettings,
  IActiveIndustriesSettings,
  AppContactSettings,
  EmailServerSettings,
  ImapServerSettings,
  WorkSettings,
  SchedulingDefaultSettings,
  DataRetentionSettings,
  OnCallSettings,
  CompensatoryRestSettings,
  SurchargeModeSettings,
  OvertimeSettings,
  ComplianceEnforcementSettings,
  ActiveIndustriesSettings,
  SurchargeRateMode,
  SurchargeStackingMode,
  OvertimeBasis,
  OvertimeRateMode,
  ComplianceEnforcementDefaultMode,
  ComplianceEnforcementRuleMode
} from 'src/app/domain/models/settings/app-settings.model';
import { IUpdateConfigSettings, UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { ISpeechSettings, SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { SttEngine, TtsProvider, SpeechDefaults } from 'src/app/domain/constants/speech-constants';
import { IHolisticHarmonizerSettings, HolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.model';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { IndustrySlugs } from 'src/app/domain/constants/industry-slugs.constants';
import { sortDayNamesMondayFirst } from 'src/app/domain/constants/day-of-week.constants';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

/**
 * Serializes a nullable numeric setting into its stored string form.
 * @param value - The raw numeric value or null when the setting is unset
 * @returns Empty string for null, otherwise the number as an invariant string
 */
function serializeNullableNumber(value: number | null): string {
  return value === null ? '' : value.toString();
}

/**
 * Parses the stored ACTIVE_INDUSTRIES value into a slug list.
 * @param value - Comma-separated industry slugs as stored in the setting
 * @returns The parsed slugs, or all industry slugs when the value is empty
 */
function parseActiveIndustries(value: string): string[] {
  const slugs = (value ?? '')
    .split(IndustrySlugs.Separator)
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0);
  return slugs.length === 0 ? [...IndustrySlugs.All] : slugs;
}

/**
 * Serializes an industry slug list into its stored string form.
 * @param slugs - The selected industry slugs
 * @returns Comma-separated slugs; an empty selection falls back to all slugs so the setting is never written empty
 */
function serializeActiveIndustries(slugs: string[]): string {
  const effective = slugs.length === 0 ? [...IndustrySlugs.All] : slugs;
  return effective.join(IndustrySlugs.Separator);
}

interface SettingsModels {
  contact: IAppContactSettings;
  email: IEmailServerSettings;
  imap: IImapServerSettings;
  work: IWorkSettings;
  schedulingDefaults: ISchedulingDefaultSettings;
  dataRetention: IDataRetentionSettings;
  update: IUpdateConfigSettings;
  openRouteServiceApiKey: string;
  deeplApiKey: string;
  erpImportCronExpression: string;
  erpImportCronTimeZone: string;
  speech: ISpeechSettings;
  holisticHarmonizer: IHolisticHarmonizerSettings;
  onCall: IOnCallSettings;
  compensatoryRest: ICompensatoryRestSettings;
  surchargeMode: ISurchargeModeSettings;
  overtime: IOvertimeSettings;
  complianceEnforcement: IComplianceEnforcementSettings;
  activeIndustries: IActiveIndustriesSettings;
}

@Injectable({
  providedIn: 'root',
})
export class AppSettingsManagementService {
  private dataSettingsService = inject(DataSettingsVariousService);
  private destroyRef = inject(DestroyRef);

  private readonly settingsHandlerMap = new Map<string, (value: string, models: SettingsModels) => void>([
    [AppSetting.APP_NAME, (v, m) => (m.contact.name = v)],
    [AppSetting.APP_ADDRESS_NAME, (v, m) => (m.contact.addressName = v)],
    [AppSetting.APP_ADDRESS_SUPPLEMENT, (v, m) => (m.contact.supplementAddress = v)],
    [AppSetting.APP_ADDRESS_ADDRESS, (v, m) => (m.contact.address = v)],
    [AppSetting.APP_ADDRESS_ZIP, (v, m) => (m.contact.zip = v)],
    [AppSetting.APP_ADDRESS_PLACE, (v, m) => (m.contact.place = v)],
    [AppSetting.APP_ADDRESS_STATE, (v, m) => (m.contact.state = v)],
    [AppSetting.APP_ADDRESS_COUNTRY, (v, m) => (m.contact.country = v)],
    [AppSetting.APP_ADDRESS_TIMEZONE, (v, m) => (m.contact.timeZone = v)],
    [AppSetting.APP_ADDRESS_PHONE, (v, m) => (m.contact.phone = v)],
    [AppSetting.APP_ADDRESS_MAIL, (v, m) => (m.contact.email = v)],
    [AppSetting.APP_ACCOUNTING_START, (v, m) => (m.contact.accountingStart = +v)],
    [AppSetting.APP_MARK, (v, m) => (m.contact.mark = v)],
    [AppSetting.GLOBAL_CALENDAR_COUNTRY, (v, m) => (m.contact.globalCalendarCountry = v)],
    [AppSetting.GLOBAL_CALENDAR_STATE, (v, m) => (m.contact.globalCalendarState = v)],
    [AppSetting.GLOBAL_CALENDAR_SELECTION_ID, (v, m) => (m.contact.globalCalendarSelectionId = v)],

    [AppSetting.APP_OUTGOING_SERVER, (v, m) => (m.email.outgoingServer = v)],
    [AppSetting.APP_OUTGOING_SERVER_PORT, (v, m) => (m.email.outgoingServerPort = v)],
    [AppSetting.APP_ENABLE_SSL, (v, m) => (m.email.enabledSSL = v)],
    [AppSetting.APP_OUTGOING_SERVER_TIMEOUT, (v, m) => (m.email.outgoingServerTimeout = v)],
    [AppSetting.APP_AUTHENTICATION_TYPE, (v, m) => (m.email.authenticationType = v)],
    [AppSetting.APP_READ_RECEIPT, (v, m) => (m.email.readReceipt = v)],
    [AppSetting.APP_REPLY_TO, (v, m) => (m.email.replyTo = v)],
    [AppSetting.APP_DISPOSITION_NOTIFICATION, (v, m) => (m.email.dispositionNotification = v)],
    [AppSetting.APP_OUTGOING_SERVER_USERNAME, (v, m) => (m.email.username = v)],
    [AppSetting.APP_OUTGOING_SERVER_PASSWORD, (v, m) => (m.email.password = v)],

    [AppSetting.APP_INCOMING_SERVER, (v, m) => (m.imap.server = v)],
    [AppSetting.APP_INCOMING_SERVER_PORT, (v, m) => (m.imap.port = v)],
    [AppSetting.APP_INCOMING_SERVER_USERNAME, (v, m) => (m.imap.username = v)],
    [AppSetting.APP_INCOMING_SERVER_PASSWORD, (v, m) => (m.imap.password = v)],
    [AppSetting.APP_INCOMING_SERVER_SSL, (v, m) => (m.imap.enableSSL = v)],
    [AppSetting.APP_INCOMING_SERVER_FOLDER, (v, m) => (m.imap.folder = v)],
    [AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL, (v, m) => (m.imap.pollInterval = v)],

    [AppSetting.OPENROUTESERVICE_API_KEY, (v, m) => (m.openRouteServiceApiKey = v)],
    [AppSetting.DEEPL_API_KEY, (v, m) => (m.deeplApiKey = v)],

    [AppSetting.ERP_IMPORT_CRON_EXPRESSION, (v, m) => (m.erpImportCronExpression = v || ErpImportScheduleDefaults.CronExpression)],
    [AppSetting.ERP_IMPORT_CRON_TIMEZONE, (v, m) => (m.erpImportCronTimeZone = v || ErpImportScheduleDefaults.CronTimeZone)],

    [AppSetting.WORK_VACATION_DAYS_PER_YEAR, (v, m) => (m.work.vacationDaysPerYear = parseInt(v, 10) || 25)],
    [AppSetting.WORK_PROBATION_PERIOD, (v, m) => (m.work.probationPeriod = parseInt(v, 10) || 3)],
    [AppSetting.WORK_NOTICE_PERIOD, (v, m) => (m.work.noticePeriod = parseInt(v, 10) || 30)],
    [AppSetting.WORK_PAYMENT_INTERVAL, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.paymentInterval = Number.isNaN(parsed) ? 2 : parsed;
    }],
    [AppSetting.WORK_NIGHT_RATE, (v, m) => (m.work.nightRate = parseFloat(v) || 0)],
    [AppSetting.WORK_HOLIDAY_RATE, (v, m) => (m.work.holidayRate = parseFloat(v) || 0)],
    [AppSetting.WORK_SA_RATE, (v, m) => (m.work.saRate = parseFloat(v) || 0)],
    [AppSetting.WORK_SO_RATE, (v, m) => (m.work.soRate = parseFloat(v) || 0)],
    [AppSetting.WORK_DAY_VISIBLE_BEFORE, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.dayVisibleBefore = Number.isNaN(parsed) ? 3 : parsed;
    }],
    [AppSetting.WORK_DAY_VISIBLE_AFTER, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.dayVisibleAfter = Number.isNaN(parsed) ? 3 : parsed;
    }],

    [AppSetting.WORK_DEFAULT_WORKING_HOURS, (v, m) => (m.schedulingDefaults.defaultWorkingHours = parseFloat(v) || 8.5)],
    [AppSetting.WORK_OVERTIME_THRESHOLD, (v, m) => (m.schedulingDefaults.overtimeThreshold = parseFloat(v) || 42)],
    [AppSetting.WORK_GUARANTEED_HOURS, (v, m) => (m.schedulingDefaults.guaranteedHours = parseFloat(v) || 0)],
    [AppSetting.WORK_MAXIMUM_HOURS, (v, m) => (m.schedulingDefaults.maximumHours = parseFloat(v) || 0)],
    [AppSetting.WORK_MINIMUM_HOURS, (v, m) => (m.schedulingDefaults.minimumHours = parseFloat(v) || 0)],
    [AppSetting.WORK_FULL_TIME, (v, m) => (m.schedulingDefaults.fullTime = parseFloat(v) || 0)],
    [AppSetting.SCHEDULING_MAX_WORK_DAYS, (v, m) => (m.schedulingDefaults.schedulingMaxWorkDays = parseInt(v, 10) || 5)],
    [AppSetting.SCHEDULING_MIN_REST_DAYS, (v, m) => (m.schedulingDefaults.schedulingMinRestDays = parseInt(v, 10) || 2)],
    [AppSetting.SCHEDULING_MIN_PAUSE_HOURS, (v, m) => (m.schedulingDefaults.schedulingMinPauseHours = parseFloat(v) || 12)],
    [AppSetting.SCHEDULING_MAX_OPTIMAL_GAP, (v, m) => (m.schedulingDefaults.schedulingMaxOptimalGap = parseFloat(v) || 2)],
    [AppSetting.SCHEDULING_MAX_DAILY_HOURS, (v, m) => (m.schedulingDefaults.schedulingMaxDailyHours = parseFloat(v) || 10)],
    [AppSetting.SCHEDULING_MAX_WEEKLY_HOURS, (v, m) => (m.schedulingDefaults.schedulingMaxWeeklyHours = parseFloat(v) || 50)],
    [AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS, (v, m) => (m.schedulingDefaults.schedulingMaxConsecutiveDays = parseInt(v, 10) || 6)],

    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY, (v, m) => (m.schedulingDefaults.workOnMonday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY, (v, m) => (m.schedulingDefaults.workOnTuesday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY, (v, m) => (m.schedulingDefaults.workOnWednesday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY, (v, m) => (m.schedulingDefaults.workOnThursday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY, (v, m) => (m.schedulingDefaults.workOnFriday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY, (v, m) => (m.schedulingDefaults.workOnSaturday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY, (v, m) => (m.schedulingDefaults.workOnSunday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK, (v, m) => (m.schedulingDefaults.performsShiftWork = v === 'true')],

    [AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE, (v, m) => (m.schedulingDefaults.commandKeywordFree = v || 'FREE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY, (v, m) => (m.schedulingDefaults.commandKeywordEarly = v || 'EARLY')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE, (v, m) => (m.schedulingDefaults.commandKeywordLate = v || 'LATE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT, (v, m) => (m.schedulingDefaults.commandKeywordNight = v || 'NIGHT')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE, (v, m) => (m.schedulingDefaults.commandKeywordNegFree = v || '-FREE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY, (v, m) => (m.schedulingDefaults.commandKeywordNegEarly = v || '-EARLY')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE, (v, m) => (m.schedulingDefaults.commandKeywordNegLate = v || '-LATE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT, (v, m) => (m.schedulingDefaults.commandKeywordNegNight = v || '-NIGHT')],

    [AppSetting.DATA_RETENTION_DAYS, (v, m) => (m.dataRetention.dataRetentionDays = parseInt(v, 10) || 3650)],

    [AppSetting.ASSISTANT_STT_ENGINE, (v, m) => (m.speech.sttEngine = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM, (v, m) => (m.speech.sttApiKeys[SttEngine.Deepgram] = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_GROQ, (v, m) => (m.speech.sttApiKeys[SttEngine.GroqWhisper] = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI, (v, m) => (m.speech.sttApiKeys[SttEngine.AssemblyAi] = v)],
    [AppSetting.ASSISTANT_TTS_VOICE, (v, m) => (m.speech.ttsVoice = v)],
    [AppSetting.ASSISTANT_TTS_PROVIDER, (v, m) => (m.speech.ttsProvider = v)],
    [AppSetting.ASSISTANT_TTS_API_KEY_OPENAI, (v, m) => (m.speech.ttsApiKeys[TtsProvider.OpenAi] = v)],
    [AppSetting.ASSISTANT_TTS_API_KEY_ELEVENLABS, (v, m) => (m.speech.ttsApiKeys[TtsProvider.ElevenLabs] = v)],
    [AppSetting.ASSISTANT_TTS_API_KEY_GOOGLE, (v, m) => (m.speech.ttsApiKeys[TtsProvider.Google] = v)],
    [AppSetting.ASSISTANT_TRANSCRIPTION_MODEL, (v, m) => (m.speech.transcriptionModel = v)],
    [AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT, (v, m) => (m.speech.transcriptionPrompt = v)],
    [AppSetting.ASSISTANT_ENHANCEMENT_ENABLED, (v, m) => (m.speech.enhancementEnabled = v === 'true')],
    [AppSetting.ASSISTANT_OUTPUT_MODE, (v, m) => (m.speech.outputMode = v)],
    [AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS, (v, m) => (m.speech.silenceThresholdMs = SpeechDefaults.clampSilenceThresholdMs(parseInt(v, 10)))],
    [AppSetting.ASSISTANT_BARGE_IN_ENABLED, (v, m) => (m.speech.bargeInEnabled = v === 'true')],

    [AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL, (v, m) => (m.holisticHarmonizer.llmModelId = v)],

    [AppSetting.UPDATE_AUTO_ENABLED, (v, m) => (m.update.autoEnabled = (v ?? '').toLowerCase() === 'true')],
    [AppSetting.UPDATE_CHANNEL, (v, m) => (m.update.channel = v || 'Stable')],
    [AppSetting.UPDATE_CHECK_INTERVAL_HOURS, (v, m) => (m.update.checkIntervalHours = parseInt(v, 10) || 6)],
    [AppSetting.UPDATE_MAINTENANCE_WINDOW_START, (v, m) => (m.update.maintenanceWindowStart = v || '')],
    [AppSetting.UPDATE_MAINTENANCE_WINDOW_END, (v, m) => (m.update.maintenanceWindowEnd = v || '')],
    [AppSetting.UPDATE_NOTIFY_ONLY, (v, m) => (m.update.notifyOnly = (v ?? '').toLowerCase() === 'true')],
    [AppSetting.UPDATE_BACKUP_RETENTION_COUNT, (v, m) => (m.update.backupRetentionCount = parseInt(v, 10) || 3)],
    [AppSetting.UPDATE_PINNED_VERSION, (v, m) => (m.update.pinnedVersion = v || '')],
    [AppSetting.CALENDAR_WEEKEND_DAYS, (v, m) => (m.schedulingDefaults.weekendDays = v
      ? sortDayNamesMondayFirst(v.split(',').map(s => s.trim()).filter(s => s.length > 0))
      : ['Saturday', 'Sunday'])],
    [AppSetting.CALENDAR_WEEK_START_DAY, (v, m) => (m.schedulingDefaults.weekStartDay = v || 'Monday')],

    [AppSetting.WORKTIME_ONCALL_ENABLED, (v, m) => (m.onCall.onCallEnabled = v === 'true')],
    [AppSetting.WORKTIME_ONCALL_PRESENCE_COUNTS_PERCENT, (v, m) => {
      const parsed = parseInt(v, 10);
      m.onCall.onCallPresenceCountsPercent = Number.isNaN(parsed) ? 100 : parsed;
    }],
    [AppSetting.WORKTIME_ONCALL_STANDBY_COUNTS_PERCENT, (v, m) => {
      const parsed = parseInt(v, 10);
      m.onCall.onCallStandbyCountsPercent = Number.isNaN(parsed) ? 0 : parsed;
    }],
    [AppSetting.WORKTIME_ONCALL_INCLUDE_IN_PERIOD_CAPS, (v, m) => (m.onCall.onCallIncludeInPeriodCaps = v === 'true')],

    [AppSetting.COMPLIANCE_COMPENSATORY_REST_ENABLED, (v, m) => (m.compensatoryRest.compensatoryRestEnabled = v === 'true')],
    [AppSetting.COMPLIANCE_COMPENSATORY_REST_DEADLINE_DAYS, (v, m) => {
      const parsed = parseInt(v, 10);
      m.compensatoryRest.compensatoryRestDeadlineDays = Number.isNaN(parsed) ? 0 : parsed;
    }],
    [AppSetting.COMPLIANCE_COMPENSATORY_REST_AUTO_PLAN, (v, m) => (m.compensatoryRest.compensatoryRestAutoPlan = v === 'true')],

    [AppSetting.WORK_WE3_RATE, (v, m) => (m.surchargeMode.we3Rate = parseFloat(v) || 0)],
    [AppSetting.SURCHARGE_NIGHT_RATE_MODE, (v, m) => (m.surchargeMode.nightRateMode = (v || 'multiplier') as SurchargeRateMode)],
    [AppSetting.SURCHARGE_HOLIDAY_RATE_MODE, (v, m) => (m.surchargeMode.holidayRateMode = (v || 'multiplier') as SurchargeRateMode)],
    [AppSetting.SURCHARGE_WE1_RATE_MODE, (v, m) => (m.surchargeMode.we1RateMode = (v || 'multiplier') as SurchargeRateMode)],
    [AppSetting.SURCHARGE_WE2_RATE_MODE, (v, m) => (m.surchargeMode.we2RateMode = (v || 'multiplier') as SurchargeRateMode)],
    [AppSetting.SURCHARGE_WE3_RATE_MODE, (v, m) => (m.surchargeMode.we3RateMode = (v || 'multiplier') as SurchargeRateMode)],
    [AppSetting.SURCHARGE_NIGHT_MINIMUM_PER_HOUR, (v, m) => (m.surchargeMode.nightMinimumPerHour = v === '' ? null : parseFloat(v))],
    [AppSetting.SURCHARGE_HOLIDAY_MINIMUM_PER_HOUR, (v, m) => (m.surchargeMode.holidayMinimumPerHour = v === '' ? null : parseFloat(v))],
    [AppSetting.SURCHARGE_WE1_MINIMUM_PER_HOUR, (v, m) => (m.surchargeMode.we1MinimumPerHour = v === '' ? null : parseFloat(v))],
    [AppSetting.SURCHARGE_WE2_MINIMUM_PER_HOUR, (v, m) => (m.surchargeMode.we2MinimumPerHour = v === '' ? null : parseFloat(v))],
    [AppSetting.SURCHARGE_WE3_MINIMUM_PER_HOUR, (v, m) => (m.surchargeMode.we3MinimumPerHour = v === '' ? null : parseFloat(v))],
    [AppSetting.SURCHARGE_NIGHT_START, (v, m) => (m.surchargeMode.nightStart = v || '23:00')],
    [AppSetting.SURCHARGE_NIGHT_END, (v, m) => (m.surchargeMode.nightEnd = v || '06:00')],
    [AppSetting.SURCHARGE_STACKING_MODE, (v, m) => (m.surchargeMode.stackingMode = (v || 'highestwins') as SurchargeStackingMode)],

    [AppSetting.OVERTIME_BASIS, (v, m) => (m.overtime.overtimeBasis = (v || 'day') as OvertimeBasis)],
    [AppSetting.OVERTIME_RATE_MODE, (v, m) => (m.overtime.overtimeRateMode = (v || 'multiplier') as OvertimeRateMode)],
    [AppSetting.OVERTIME_TIER1_AFTER_HOURS, (v, m) => (m.overtime.overtimeTier1AfterHours = v === '' ? null : parseFloat(v))],
    [AppSetting.OVERTIME_TIER1_RATE, (v, m) => (m.overtime.overtimeTier1Rate = v === '' ? null : parseFloat(v))],
    [AppSetting.OVERTIME_TIER2_AFTER_HOURS, (v, m) => (m.overtime.overtimeTier2AfterHours = v === '' ? null : parseFloat(v))],
    [AppSetting.OVERTIME_TIER2_RATE, (v, m) => (m.overtime.overtimeTier2Rate = v === '' ? null : parseFloat(v))],
    [AppSetting.OVERTIME_TIER3_AFTER_HOURS, (v, m) => (m.overtime.overtimeTier3AfterHours = v === '' ? null : parseFloat(v))],
    [AppSetting.OVERTIME_TIER3_RATE, (v, m) => (m.overtime.overtimeTier3Rate = v === '' ? null : parseFloat(v))],

    [AppSetting.COMPLIANCE_ENFORCEMENT_DEFAULT_MODE, (v, m) => (m.complianceEnforcement.enforcementDefaultMode = (v || 'warn') as ComplianceEnforcementDefaultMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_ALLOW_SUPERVISOR_OVERRIDE, (v, m) => (m.complianceEnforcement.enforcementAllowSupervisorOverride = v === 'true')],
    [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_DAILY_HOURS, (v, m) => (m.complianceEnforcement.enforcementMaxDailyHours = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_WEEKLY_HOURS, (v, m) => (m.complianceEnforcement.enforcementMaxWeeklyHours = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_HOURS, (v, m) => (m.complianceEnforcement.enforcementMinRestHours = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_DAYS, (v, m) => (m.complianceEnforcement.enforcementMinRestDays = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_CONSECUTIVE_DAYS, (v, m) => (m.complianceEnforcement.enforcementMaxConsecutiveDays = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_PERIOD_CAP, (v, m) => (m.complianceEnforcement.enforcementPeriodCap = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_ROLLING_AVERAGE, (v, m) => (m.complianceEnforcement.enforcementRollingAverage = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_REST_DAY_ROTATION, (v, m) => (m.complianceEnforcement.enforcementRestDayRotation = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_COUNTER_RULE, (v, m) => (m.complianceEnforcement.enforcementCounterRule = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_COMPENSATORY_REST, (v, m) => (m.complianceEnforcement.enforcementCompensatoryRest = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ENFORCEMENT_RESTRICTED_TIME_WINDOW, (v, m) => (m.complianceEnforcement.enforcementRestrictedTimeWindow = (v ?? '') as ComplianceEnforcementRuleMode)],
    [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_MIN_LEAD_DAYS, (v, m) => {
      const parsed = parseInt(v, 10);
      m.complianceEnforcement.rosterPublicationMinLeadDays = Number.isNaN(parsed) ? 0 : parsed;
    }],
    [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_COUNT_WORKDAYS_ONLY, (v, m) => (m.complianceEnforcement.rosterPublicationCountWorkdaysOnly = v === 'true')],

    [AppSetting.ACTIVE_INDUSTRIES, (v, m) => (m.activeIndustries.activeIndustries = parseActiveIndustries(v))],
  ]);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());
  public imapSettings = signal<IImapServerSettings>(new ImapServerSettings());
  public workSettings = signal<IWorkSettings>(new WorkSettings());
  public schedulingDefaultSettings = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  public dataRetentionSettings = signal<IDataRetentionSettings>(new DataRetentionSettings());
  public updateConfigSettings = signal<IUpdateConfigSettings>(new UpdateConfigSettings());
  public openRouteServiceApiKey = signal<string>('');
  public deeplApiKey = signal<string>('');
  public erpImportCronExpression = signal<string>(ErpImportScheduleDefaults.CronExpression);
  public erpImportCronTimeZone = signal<string>(ErpImportScheduleDefaults.CronTimeZone);
  public speechSettings = signal<ISpeechSettings>(new SpeechSettings());
  public holisticHarmonizerSettings = signal<IHolisticHarmonizerSettings>(new HolisticHarmonizerSettings());
  public onCallSettings = signal<IOnCallSettings>(new OnCallSettings());
  public compensatoryRestSettings = signal<ICompensatoryRestSettings>(new CompensatoryRestSettings());
  public surchargeModeSettings = signal<ISurchargeModeSettings>(new SurchargeModeSettings());
  public overtimeSettings = signal<IOvertimeSettings>(new OvertimeSettings());
  public complianceEnforcementSettings = signal<IComplianceEnforcementSettings>(new ComplianceEnforcementSettings());
  public activeIndustriesSettings = signal<IActiveIndustriesSettings>(new ActiveIndustriesSettings());

  private contactSettingsOriginal = signal<IAppContactSettings>(new AppContactSettings());
  private emailSettingsOriginal = signal<IEmailServerSettings>(new EmailServerSettings());
  private imapSettingsOriginal = signal<IImapServerSettings>(new ImapServerSettings());
  private workSettingsOriginal = signal<IWorkSettings>(new WorkSettings());
  private schedulingDefaultSettingsOriginal = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  private dataRetentionSettingsOriginal = signal<IDataRetentionSettings>(new DataRetentionSettings());
  private updateConfigSettingsOriginal = signal<IUpdateConfigSettings>(new UpdateConfigSettings());
  private openRouteServiceApiKeyOriginal = signal<string>('');
  private deeplApiKeyOriginal = signal<string>('');
  private erpImportCronExpressionOriginal = signal<string>(ErpImportScheduleDefaults.CronExpression);
  private erpImportCronTimeZoneOriginal = signal<string>(ErpImportScheduleDefaults.CronTimeZone);
  private speechSettingsOriginal = signal<ISpeechSettings>(new SpeechSettings());
  private holisticHarmonizerSettingsOriginal = signal<IHolisticHarmonizerSettings>(new HolisticHarmonizerSettings());
  private onCallSettingsOriginal = signal<IOnCallSettings>(new OnCallSettings());
  private compensatoryRestSettingsOriginal = signal<ICompensatoryRestSettings>(new CompensatoryRestSettings());
  private surchargeModeSettingsOriginal = signal<ISurchargeModeSettings>(new SurchargeModeSettings());
  private overtimeSettingsOriginal = signal<IOvertimeSettings>(new OvertimeSettings());
  private complianceEnforcementSettingsOriginal = signal<IComplianceEnforcementSettings>(new ComplianceEnforcementSettings());
  private activeIndustriesSettingsOriginal = signal<IActiveIndustriesSettings>(new ActiveIndustriesSettings());

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => this.checkIfDirty());

  private settingsList: ISetting[] = [];
  private saveCounter = 0;
  private saveCompletionResolvers: (() => void)[] = [];
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.contactSettings();
      this.emailSettings();
      this.imapSettings();
      this.workSettings();
      this.schedulingDefaultSettings();
      this.dataRetentionSettings();
      this.updateConfigSettings();
      this.openRouteServiceApiKey();
      this.deeplApiKey();
      this.erpImportCronExpression();
      this.erpImportCronTimeZone();
      this.speechSettings();
      this.holisticHarmonizerSettings();
      this.onCallSettings();
      this.compensatoryRestSettings();
      this.surchargeModeSettings();
      this.overtimeSettings();
      this.complianceEnforcementSettings();
      this.activeIndustriesSettings();

      untracked(() => {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
          if (this.isDirty()) {
            this.save();
          }
        }, 1500);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
    });
  }

  loadSettings(): void {
    this.isLoading.set(true);

    this.dataSettingsService
      .readSettingList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.settingsList = settings as ISetting[];
            this.applySettingsToModels(settings as ISetting[]);
          }
        },
        error: (error) => {
          console.error('Failed to load app settings:', error);
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  async loadSettingsAsync(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.dataSettingsService.readSettingList());
      if (settings) {
        this.settingsList = settings as ISetting[];
        this.applySettingsToModels(settings as ISetting[]);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  }

  private applySettingsToModels(settings: ISetting[]): void {
    const models: SettingsModels = {
      contact: new AppContactSettings(),
      email: new EmailServerSettings(),
      imap: new ImapServerSettings(),
      work: new WorkSettings(),
      schedulingDefaults: new SchedulingDefaultSettings(),
      dataRetention: new DataRetentionSettings(),
      update: new UpdateConfigSettings(),
      openRouteServiceApiKey: '',
      deeplApiKey: '',
      erpImportCronExpression: ErpImportScheduleDefaults.CronExpression,
      erpImportCronTimeZone: ErpImportScheduleDefaults.CronTimeZone,
      speech: new SpeechSettings(),
      holisticHarmonizer: new HolisticHarmonizerSettings(),
      onCall: new OnCallSettings(),
      compensatoryRest: new CompensatoryRestSettings(),
      surchargeMode: new SurchargeModeSettings(),
      overtime: new OvertimeSettings(),
      complianceEnforcement: new ComplianceEnforcementSettings(),
      activeIndustries: new ActiveIndustriesSettings(),
    };

    for (const setting of settings) {
      const handler = this.settingsHandlerMap.get(setting.type);
      if (handler) {
        handler(setting.value, models);
      }
    }

    this.contactSettings.set(models.contact);
    this.emailSettings.set(models.email);
    this.imapSettings.set(models.imap);
    this.workSettings.set(models.work);
    this.schedulingDefaultSettings.set(models.schedulingDefaults);
    this.dataRetentionSettings.set(models.dataRetention);
    this.updateConfigSettings.set(models.update);
    this.openRouteServiceApiKey.set(models.openRouteServiceApiKey);
    this.deeplApiKey.set(models.deeplApiKey);
    this.erpImportCronExpression.set(models.erpImportCronExpression);
    this.erpImportCronTimeZone.set(models.erpImportCronTimeZone);
    this.speechSettings.set(models.speech);
    this.holisticHarmonizerSettings.set(models.holisticHarmonizer);
    this.onCallSettings.set(models.onCall);
    this.compensatoryRestSettings.set(models.compensatoryRest);
    this.surchargeModeSettings.set(models.surchargeMode);
    this.overtimeSettings.set(models.overtime);
    this.complianceEnforcementSettings.set(models.complianceEnforcement);
    this.activeIndustriesSettings.set(models.activeIndustries);

    this.contactSettingsOriginal.set(cloneObject(models.contact));
    this.emailSettingsOriginal.set(cloneObject(models.email));
    this.imapSettingsOriginal.set(cloneObject(models.imap));
    this.workSettingsOriginal.set(cloneObject(models.work));
    this.schedulingDefaultSettingsOriginal.set(cloneObject(models.schedulingDefaults));
    this.dataRetentionSettingsOriginal.set(cloneObject(models.dataRetention));
    this.updateConfigSettingsOriginal.set(cloneObject(models.update));
    this.openRouteServiceApiKeyOriginal.set(models.openRouteServiceApiKey);
    this.deeplApiKeyOriginal.set(models.deeplApiKey);
    this.erpImportCronExpressionOriginal.set(models.erpImportCronExpression);
    this.erpImportCronTimeZoneOriginal.set(models.erpImportCronTimeZone);
    this.speechSettingsOriginal.set(cloneObject(models.speech));
    this.holisticHarmonizerSettingsOriginal.set(cloneObject(models.holisticHarmonizer));
    this.onCallSettingsOriginal.set(cloneObject(models.onCall));
    this.compensatoryRestSettingsOriginal.set(cloneObject(models.compensatoryRest));
    this.surchargeModeSettingsOriginal.set(cloneObject(models.surchargeMode));
    this.overtimeSettingsOriginal.set(cloneObject(models.overtime));
    this.complianceEnforcementSettingsOriginal.set(cloneObject(models.complianceEnforcement));
    this.activeIndustriesSettingsOriginal.set(cloneObject(models.activeIndustries));
  }

  private readonly saveDefinitions: readonly { key: string; getCurrent: () => string; getOriginal: () => string }[] = [
    { key: AppSetting.APP_NAME, getCurrent: () => this.contactSettings().name, getOriginal: () => this.contactSettingsOriginal().name },
    { key: AppSetting.APP_ADDRESS_NAME, getCurrent: () => this.contactSettings().addressName, getOriginal: () => this.contactSettingsOriginal().addressName },
    { key: AppSetting.APP_ADDRESS_SUPPLEMENT, getCurrent: () => this.contactSettings().supplementAddress, getOriginal: () => this.contactSettingsOriginal().supplementAddress },
    { key: AppSetting.APP_ADDRESS_ADDRESS, getCurrent: () => this.contactSettings().address, getOriginal: () => this.contactSettingsOriginal().address },
    { key: AppSetting.APP_ADDRESS_ZIP, getCurrent: () => this.contactSettings().zip, getOriginal: () => this.contactSettingsOriginal().zip },
    { key: AppSetting.APP_ADDRESS_PLACE, getCurrent: () => this.contactSettings().place, getOriginal: () => this.contactSettingsOriginal().place },
    { key: AppSetting.APP_ADDRESS_STATE, getCurrent: () => this.contactSettings().state, getOriginal: () => this.contactSettingsOriginal().state },
    { key: AppSetting.APP_ADDRESS_COUNTRY, getCurrent: () => this.contactSettings().country, getOriginal: () => this.contactSettingsOriginal().country },
    { key: AppSetting.APP_ADDRESS_TIMEZONE, getCurrent: () => this.contactSettings().timeZone, getOriginal: () => this.contactSettingsOriginal().timeZone },
    { key: AppSetting.APP_ADDRESS_PHONE, getCurrent: () => this.contactSettings().phone, getOriginal: () => this.contactSettingsOriginal().phone },
    { key: AppSetting.APP_ADDRESS_MAIL, getCurrent: () => this.contactSettings().email, getOriginal: () => this.contactSettingsOriginal().email },
    { key: AppSetting.APP_ACCOUNTING_START, getCurrent: () => this.contactSettings().accountingStart.toString(), getOriginal: () => this.contactSettingsOriginal().accountingStart.toString() },
    { key: AppSetting.APP_MARK, getCurrent: () => this.contactSettings().mark, getOriginal: () => this.contactSettingsOriginal().mark },
    { key: AppSetting.GLOBAL_CALENDAR_COUNTRY, getCurrent: () => this.contactSettings().globalCalendarCountry, getOriginal: () => this.contactSettingsOriginal().globalCalendarCountry },
    { key: AppSetting.GLOBAL_CALENDAR_STATE, getCurrent: () => this.contactSettings().globalCalendarState, getOriginal: () => this.contactSettingsOriginal().globalCalendarState },
    { key: AppSetting.GLOBAL_CALENDAR_SELECTION_ID, getCurrent: () => this.contactSettings().globalCalendarSelectionId, getOriginal: () => this.contactSettingsOriginal().globalCalendarSelectionId },

    { key: AppSetting.APP_OUTGOING_SERVER, getCurrent: () => this.emailSettings().outgoingServer, getOriginal: () => this.emailSettingsOriginal().outgoingServer },
    { key: AppSetting.APP_OUTGOING_SERVER_PORT, getCurrent: () => this.emailSettings().outgoingServerPort, getOriginal: () => this.emailSettingsOriginal().outgoingServerPort },
    { key: AppSetting.APP_ENABLE_SSL, getCurrent: () => this.emailSettings().enabledSSL, getOriginal: () => this.emailSettingsOriginal().enabledSSL },
    { key: AppSetting.APP_OUTGOING_SERVER_TIMEOUT, getCurrent: () => this.emailSettings().outgoingServerTimeout, getOriginal: () => this.emailSettingsOriginal().outgoingServerTimeout },
    { key: AppSetting.APP_AUTHENTICATION_TYPE, getCurrent: () => this.emailSettings().authenticationType, getOriginal: () => this.emailSettingsOriginal().authenticationType },
    { key: AppSetting.APP_READ_RECEIPT, getCurrent: () => this.emailSettings().readReceipt, getOriginal: () => this.emailSettingsOriginal().readReceipt },
    { key: AppSetting.APP_REPLY_TO, getCurrent: () => this.emailSettings().replyTo, getOriginal: () => this.emailSettingsOriginal().replyTo },
    { key: AppSetting.APP_DISPOSITION_NOTIFICATION, getCurrent: () => this.emailSettings().dispositionNotification, getOriginal: () => this.emailSettingsOriginal().dispositionNotification },
    { key: AppSetting.APP_OUTGOING_SERVER_USERNAME, getCurrent: () => this.emailSettings().username, getOriginal: () => this.emailSettingsOriginal().username },
    { key: AppSetting.APP_OUTGOING_SERVER_PASSWORD, getCurrent: () => this.emailSettings().password, getOriginal: () => this.emailSettingsOriginal().password },

    { key: AppSetting.APP_INCOMING_SERVER, getCurrent: () => this.imapSettings().server, getOriginal: () => this.imapSettingsOriginal().server },
    { key: AppSetting.APP_INCOMING_SERVER_PORT, getCurrent: () => this.imapSettings().port, getOriginal: () => this.imapSettingsOriginal().port },
    { key: AppSetting.APP_INCOMING_SERVER_USERNAME, getCurrent: () => this.imapSettings().username, getOriginal: () => this.imapSettingsOriginal().username },
    { key: AppSetting.APP_INCOMING_SERVER_PASSWORD, getCurrent: () => this.imapSettings().password, getOriginal: () => this.imapSettingsOriginal().password },
    { key: AppSetting.APP_INCOMING_SERVER_SSL, getCurrent: () => this.imapSettings().enableSSL, getOriginal: () => this.imapSettingsOriginal().enableSSL },
    { key: AppSetting.APP_INCOMING_SERVER_FOLDER, getCurrent: () => this.imapSettings().folder, getOriginal: () => this.imapSettingsOriginal().folder },
    { key: AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL, getCurrent: () => this.imapSettings().pollInterval, getOriginal: () => this.imapSettingsOriginal().pollInterval },

    { key: AppSetting.WORK_VACATION_DAYS_PER_YEAR, getCurrent: () => this.workSettings().vacationDaysPerYear.toString(), getOriginal: () => this.workSettingsOriginal().vacationDaysPerYear.toString() },
    { key: AppSetting.WORK_PROBATION_PERIOD, getCurrent: () => this.workSettings().probationPeriod.toString(), getOriginal: () => this.workSettingsOriginal().probationPeriod.toString() },
    { key: AppSetting.WORK_NOTICE_PERIOD, getCurrent: () => this.workSettings().noticePeriod.toString(), getOriginal: () => this.workSettingsOriginal().noticePeriod.toString() },
    { key: AppSetting.WORK_PAYMENT_INTERVAL, getCurrent: () => this.workSettings().paymentInterval.toString(), getOriginal: () => this.workSettingsOriginal().paymentInterval.toString() },
    { key: AppSetting.WORK_NIGHT_RATE, getCurrent: () => this.workSettings().nightRate.toString(), getOriginal: () => this.workSettingsOriginal().nightRate.toString() },
    { key: AppSetting.WORK_HOLIDAY_RATE, getCurrent: () => this.workSettings().holidayRate.toString(), getOriginal: () => this.workSettingsOriginal().holidayRate.toString() },
    { key: AppSetting.WORK_SA_RATE, getCurrent: () => this.workSettings().saRate.toString(), getOriginal: () => this.workSettingsOriginal().saRate.toString() },
    { key: AppSetting.WORK_SO_RATE, getCurrent: () => this.workSettings().soRate.toString(), getOriginal: () => this.workSettingsOriginal().soRate.toString() },
    { key: AppSetting.WORK_DAY_VISIBLE_BEFORE, getCurrent: () => this.workSettings().dayVisibleBefore.toString(), getOriginal: () => this.workSettingsOriginal().dayVisibleBefore.toString() },
    { key: AppSetting.WORK_DAY_VISIBLE_AFTER, getCurrent: () => this.workSettings().dayVisibleAfter.toString(), getOriginal: () => this.workSettingsOriginal().dayVisibleAfter.toString() },

    { key: AppSetting.WORK_DEFAULT_WORKING_HOURS, getCurrent: () => this.schedulingDefaultSettings().defaultWorkingHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().defaultWorkingHours.toString() },
    { key: AppSetting.WORK_OVERTIME_THRESHOLD, getCurrent: () => this.schedulingDefaultSettings().overtimeThreshold.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().overtimeThreshold.toString() },
    { key: AppSetting.WORK_GUARANTEED_HOURS, getCurrent: () => this.schedulingDefaultSettings().guaranteedHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().guaranteedHours.toString() },
    { key: AppSetting.WORK_MAXIMUM_HOURS, getCurrent: () => this.schedulingDefaultSettings().maximumHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().maximumHours.toString() },
    { key: AppSetting.WORK_MINIMUM_HOURS, getCurrent: () => this.schedulingDefaultSettings().minimumHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().minimumHours.toString() },
    { key: AppSetting.WORK_FULL_TIME, getCurrent: () => this.schedulingDefaultSettings().fullTime.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().fullTime.toString() },
    { key: AppSetting.SCHEDULING_MAX_WORK_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxWorkDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxWorkDays.toString() },
    { key: AppSetting.SCHEDULING_MIN_REST_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMinRestDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMinRestDays.toString() },
    { key: AppSetting.SCHEDULING_MIN_PAUSE_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMinPauseHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMinPauseHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_OPTIMAL_GAP, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxOptimalGap.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxOptimalGap.toString() },
    { key: AppSetting.SCHEDULING_MAX_DAILY_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxDailyHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxDailyHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_WEEKLY_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxWeeklyHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxWeeklyHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxConsecutiveDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxConsecutiveDays.toString() },

    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY, getCurrent: () => this.schedulingDefaultSettings().workOnMonday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnMonday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY, getCurrent: () => this.schedulingDefaultSettings().workOnTuesday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnTuesday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY, getCurrent: () => this.schedulingDefaultSettings().workOnWednesday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnWednesday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY, getCurrent: () => this.schedulingDefaultSettings().workOnThursday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnThursday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY, getCurrent: () => this.schedulingDefaultSettings().workOnFriday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnFriday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY, getCurrent: () => this.schedulingDefaultSettings().workOnSaturday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnSaturday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY, getCurrent: () => this.schedulingDefaultSettings().workOnSunday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnSunday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK, getCurrent: () => this.schedulingDefaultSettings().performsShiftWork.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().performsShiftWork.toString() },

    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordFree, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordFree },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY, getCurrent: () => this.schedulingDefaultSettings().commandKeywordEarly, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordEarly },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordLate, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordLate },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNight, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNight },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegFree, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegFree },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegEarly, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegEarly },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegLate, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegLate },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegNight, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegNight },

    { key: AppSetting.DATA_RETENTION_DAYS, getCurrent: () => this.dataRetentionSettings().dataRetentionDays.toString(), getOriginal: () => this.dataRetentionSettingsOriginal().dataRetentionDays.toString() },

    { key: AppSetting.OPENROUTESERVICE_API_KEY, getCurrent: () => this.openRouteServiceApiKey(), getOriginal: () => this.openRouteServiceApiKeyOriginal() },
    { key: AppSetting.DEEPL_API_KEY, getCurrent: () => this.deeplApiKey(), getOriginal: () => this.deeplApiKeyOriginal() },

    { key: AppSetting.ERP_IMPORT_CRON_EXPRESSION, getCurrent: () => this.erpImportCronExpression(), getOriginal: () => this.erpImportCronExpressionOriginal() },
    { key: AppSetting.ERP_IMPORT_CRON_TIMEZONE, getCurrent: () => this.erpImportCronTimeZone(), getOriginal: () => this.erpImportCronTimeZoneOriginal() },

    { key: AppSetting.ASSISTANT_STT_ENGINE, getCurrent: () => this.speechSettings().sttEngine, getOriginal: () => this.speechSettingsOriginal().sttEngine },
    { key: AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.Deepgram] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.Deepgram] ?? '' },
    { key: AppSetting.ASSISTANT_STT_API_KEY_GROQ, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.GroqWhisper] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.GroqWhisper] ?? '' },
    { key: AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.AssemblyAi] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.AssemblyAi] ?? '' },
    { key: AppSetting.ASSISTANT_TTS_VOICE, getCurrent: () => this.speechSettings().ttsVoice, getOriginal: () => this.speechSettingsOriginal().ttsVoice },
    { key: AppSetting.ASSISTANT_TTS_PROVIDER, getCurrent: () => this.speechSettings().ttsProvider, getOriginal: () => this.speechSettingsOriginal().ttsProvider },
    { key: AppSetting.ASSISTANT_TTS_API_KEY_OPENAI, getCurrent: () => this.speechSettings().ttsApiKeys[TtsProvider.OpenAi] ?? '', getOriginal: () => this.speechSettingsOriginal().ttsApiKeys[TtsProvider.OpenAi] ?? '' },
    { key: AppSetting.ASSISTANT_TTS_API_KEY_ELEVENLABS, getCurrent: () => this.speechSettings().ttsApiKeys[TtsProvider.ElevenLabs] ?? '', getOriginal: () => this.speechSettingsOriginal().ttsApiKeys[TtsProvider.ElevenLabs] ?? '' },
    { key: AppSetting.ASSISTANT_TTS_API_KEY_GOOGLE, getCurrent: () => this.speechSettings().ttsApiKeys[TtsProvider.Google] ?? '', getOriginal: () => this.speechSettingsOriginal().ttsApiKeys[TtsProvider.Google] ?? '' },
    { key: AppSetting.ASSISTANT_TRANSCRIPTION_MODEL, getCurrent: () => this.speechSettings().transcriptionModel, getOriginal: () => this.speechSettingsOriginal().transcriptionModel },
    { key: AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT, getCurrent: () => this.speechSettings().transcriptionPrompt, getOriginal: () => this.speechSettingsOriginal().transcriptionPrompt },
    { key: AppSetting.ASSISTANT_ENHANCEMENT_ENABLED, getCurrent: () => String(this.speechSettings().enhancementEnabled), getOriginal: () => String(this.speechSettingsOriginal().enhancementEnabled) },
    { key: AppSetting.ASSISTANT_OUTPUT_MODE, getCurrent: () => this.speechSettings().outputMode, getOriginal: () => this.speechSettingsOriginal().outputMode },
    { key: AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS, getCurrent: () => String(this.speechSettings().silenceThresholdMs), getOriginal: () => String(this.speechSettingsOriginal().silenceThresholdMs) },
    { key: AppSetting.ASSISTANT_BARGE_IN_ENABLED, getCurrent: () => String(this.speechSettings().bargeInEnabled), getOriginal: () => String(this.speechSettingsOriginal().bargeInEnabled) },

    { key: AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL, getCurrent: () => this.holisticHarmonizerSettings().llmModelId, getOriginal: () => this.holisticHarmonizerSettingsOriginal().llmModelId },

    { key: AppSetting.UPDATE_AUTO_ENABLED, getCurrent: () => String(this.updateConfigSettings().autoEnabled), getOriginal: () => String(this.updateConfigSettingsOriginal().autoEnabled) },
    { key: AppSetting.UPDATE_CHANNEL, getCurrent: () => this.updateConfigSettings().channel, getOriginal: () => this.updateConfigSettingsOriginal().channel },
    { key: AppSetting.UPDATE_CHECK_INTERVAL_HOURS, getCurrent: () => this.updateConfigSettings().checkIntervalHours.toString(), getOriginal: () => this.updateConfigSettingsOriginal().checkIntervalHours.toString() },
    { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_START, getCurrent: () => this.updateConfigSettings().maintenanceWindowStart, getOriginal: () => this.updateConfigSettingsOriginal().maintenanceWindowStart },
    { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_END, getCurrent: () => this.updateConfigSettings().maintenanceWindowEnd, getOriginal: () => this.updateConfigSettingsOriginal().maintenanceWindowEnd },
    { key: AppSetting.UPDATE_NOTIFY_ONLY, getCurrent: () => String(this.updateConfigSettings().notifyOnly), getOriginal: () => String(this.updateConfigSettingsOriginal().notifyOnly) },
    { key: AppSetting.UPDATE_BACKUP_RETENTION_COUNT, getCurrent: () => this.updateConfigSettings().backupRetentionCount.toString(), getOriginal: () => this.updateConfigSettingsOriginal().backupRetentionCount.toString() },
    { key: AppSetting.UPDATE_PINNED_VERSION, getCurrent: () => this.updateConfigSettings().pinnedVersion, getOriginal: () => this.updateConfigSettingsOriginal().pinnedVersion },

    { key: AppSetting.CALENDAR_WEEKEND_DAYS, getCurrent: () => this.schedulingDefaultSettings().weekendDays.join(','), getOriginal: () => this.schedulingDefaultSettingsOriginal().weekendDays.join(',') },
    { key: AppSetting.CALENDAR_WEEK_START_DAY, getCurrent: () => this.schedulingDefaultSettings().weekStartDay, getOriginal: () => this.schedulingDefaultSettingsOriginal().weekStartDay },

    { key: AppSetting.WORKTIME_ONCALL_ENABLED, getCurrent: () => String(this.onCallSettings().onCallEnabled), getOriginal: () => String(this.onCallSettingsOriginal().onCallEnabled) },
    { key: AppSetting.WORKTIME_ONCALL_PRESENCE_COUNTS_PERCENT, getCurrent: () => this.onCallSettings().onCallPresenceCountsPercent.toString(), getOriginal: () => this.onCallSettingsOriginal().onCallPresenceCountsPercent.toString() },
    { key: AppSetting.WORKTIME_ONCALL_STANDBY_COUNTS_PERCENT, getCurrent: () => this.onCallSettings().onCallStandbyCountsPercent.toString(), getOriginal: () => this.onCallSettingsOriginal().onCallStandbyCountsPercent.toString() },
    { key: AppSetting.WORKTIME_ONCALL_INCLUDE_IN_PERIOD_CAPS, getCurrent: () => String(this.onCallSettings().onCallIncludeInPeriodCaps), getOriginal: () => String(this.onCallSettingsOriginal().onCallIncludeInPeriodCaps) },

    { key: AppSetting.COMPLIANCE_COMPENSATORY_REST_ENABLED, getCurrent: () => String(this.compensatoryRestSettings().compensatoryRestEnabled), getOriginal: () => String(this.compensatoryRestSettingsOriginal().compensatoryRestEnabled) },
    { key: AppSetting.COMPLIANCE_COMPENSATORY_REST_DEADLINE_DAYS, getCurrent: () => this.compensatoryRestSettings().compensatoryRestDeadlineDays.toString(), getOriginal: () => this.compensatoryRestSettingsOriginal().compensatoryRestDeadlineDays.toString() },
    { key: AppSetting.COMPLIANCE_COMPENSATORY_REST_AUTO_PLAN, getCurrent: () => String(this.compensatoryRestSettings().compensatoryRestAutoPlan), getOriginal: () => String(this.compensatoryRestSettingsOriginal().compensatoryRestAutoPlan) },

    { key: AppSetting.WORK_WE3_RATE, getCurrent: () => this.surchargeModeSettings().we3Rate.toString(), getOriginal: () => this.surchargeModeSettingsOriginal().we3Rate.toString() },
    { key: AppSetting.SURCHARGE_NIGHT_RATE_MODE, getCurrent: () => this.surchargeModeSettings().nightRateMode, getOriginal: () => this.surchargeModeSettingsOriginal().nightRateMode },
    { key: AppSetting.SURCHARGE_HOLIDAY_RATE_MODE, getCurrent: () => this.surchargeModeSettings().holidayRateMode, getOriginal: () => this.surchargeModeSettingsOriginal().holidayRateMode },
    { key: AppSetting.SURCHARGE_WE1_RATE_MODE, getCurrent: () => this.surchargeModeSettings().we1RateMode, getOriginal: () => this.surchargeModeSettingsOriginal().we1RateMode },
    { key: AppSetting.SURCHARGE_WE2_RATE_MODE, getCurrent: () => this.surchargeModeSettings().we2RateMode, getOriginal: () => this.surchargeModeSettingsOriginal().we2RateMode },
    { key: AppSetting.SURCHARGE_WE3_RATE_MODE, getCurrent: () => this.surchargeModeSettings().we3RateMode, getOriginal: () => this.surchargeModeSettingsOriginal().we3RateMode },
    { key: AppSetting.SURCHARGE_NIGHT_MINIMUM_PER_HOUR, getCurrent: () => serializeNullableNumber(this.surchargeModeSettings().nightMinimumPerHour), getOriginal: () => serializeNullableNumber(this.surchargeModeSettingsOriginal().nightMinimumPerHour) },
    { key: AppSetting.SURCHARGE_HOLIDAY_MINIMUM_PER_HOUR, getCurrent: () => serializeNullableNumber(this.surchargeModeSettings().holidayMinimumPerHour), getOriginal: () => serializeNullableNumber(this.surchargeModeSettingsOriginal().holidayMinimumPerHour) },
    { key: AppSetting.SURCHARGE_WE1_MINIMUM_PER_HOUR, getCurrent: () => serializeNullableNumber(this.surchargeModeSettings().we1MinimumPerHour), getOriginal: () => serializeNullableNumber(this.surchargeModeSettingsOriginal().we1MinimumPerHour) },
    { key: AppSetting.SURCHARGE_WE2_MINIMUM_PER_HOUR, getCurrent: () => serializeNullableNumber(this.surchargeModeSettings().we2MinimumPerHour), getOriginal: () => serializeNullableNumber(this.surchargeModeSettingsOriginal().we2MinimumPerHour) },
    { key: AppSetting.SURCHARGE_WE3_MINIMUM_PER_HOUR, getCurrent: () => serializeNullableNumber(this.surchargeModeSettings().we3MinimumPerHour), getOriginal: () => serializeNullableNumber(this.surchargeModeSettingsOriginal().we3MinimumPerHour) },
    { key: AppSetting.SURCHARGE_NIGHT_START, getCurrent: () => this.surchargeModeSettings().nightStart, getOriginal: () => this.surchargeModeSettingsOriginal().nightStart },
    { key: AppSetting.SURCHARGE_NIGHT_END, getCurrent: () => this.surchargeModeSettings().nightEnd, getOriginal: () => this.surchargeModeSettingsOriginal().nightEnd },
    { key: AppSetting.SURCHARGE_STACKING_MODE, getCurrent: () => this.surchargeModeSettings().stackingMode, getOriginal: () => this.surchargeModeSettingsOriginal().stackingMode },

    { key: AppSetting.OVERTIME_BASIS, getCurrent: () => this.overtimeSettings().overtimeBasis, getOriginal: () => this.overtimeSettingsOriginal().overtimeBasis },
    { key: AppSetting.OVERTIME_RATE_MODE, getCurrent: () => this.overtimeSettings().overtimeRateMode, getOriginal: () => this.overtimeSettingsOriginal().overtimeRateMode },
    { key: AppSetting.OVERTIME_TIER1_AFTER_HOURS, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier1AfterHours), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier1AfterHours) },
    { key: AppSetting.OVERTIME_TIER1_RATE, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier1Rate), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier1Rate) },
    { key: AppSetting.OVERTIME_TIER2_AFTER_HOURS, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier2AfterHours), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier2AfterHours) },
    { key: AppSetting.OVERTIME_TIER2_RATE, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier2Rate), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier2Rate) },
    { key: AppSetting.OVERTIME_TIER3_AFTER_HOURS, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier3AfterHours), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier3AfterHours) },
    { key: AppSetting.OVERTIME_TIER3_RATE, getCurrent: () => serializeNullableNumber(this.overtimeSettings().overtimeTier3Rate), getOriginal: () => serializeNullableNumber(this.overtimeSettingsOriginal().overtimeTier3Rate) },

    { key: AppSetting.COMPLIANCE_ENFORCEMENT_DEFAULT_MODE, getCurrent: () => this.complianceEnforcementSettings().enforcementDefaultMode, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementDefaultMode },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_ALLOW_SUPERVISOR_OVERRIDE, getCurrent: () => String(this.complianceEnforcementSettings().enforcementAllowSupervisorOverride), getOriginal: () => String(this.complianceEnforcementSettingsOriginal().enforcementAllowSupervisorOverride) },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_DAILY_HOURS, getCurrent: () => this.complianceEnforcementSettings().enforcementMaxDailyHours, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementMaxDailyHours },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_WEEKLY_HOURS, getCurrent: () => this.complianceEnforcementSettings().enforcementMaxWeeklyHours, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementMaxWeeklyHours },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_HOURS, getCurrent: () => this.complianceEnforcementSettings().enforcementMinRestHours, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementMinRestHours },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_DAYS, getCurrent: () => this.complianceEnforcementSettings().enforcementMinRestDays, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementMinRestDays },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_CONSECUTIVE_DAYS, getCurrent: () => this.complianceEnforcementSettings().enforcementMaxConsecutiveDays, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementMaxConsecutiveDays },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_PERIOD_CAP, getCurrent: () => this.complianceEnforcementSettings().enforcementPeriodCap, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementPeriodCap },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_ROLLING_AVERAGE, getCurrent: () => this.complianceEnforcementSettings().enforcementRollingAverage, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementRollingAverage },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_REST_DAY_ROTATION, getCurrent: () => this.complianceEnforcementSettings().enforcementRestDayRotation, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementRestDayRotation },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_COUNTER_RULE, getCurrent: () => this.complianceEnforcementSettings().enforcementCounterRule, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementCounterRule },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_COMPENSATORY_REST, getCurrent: () => this.complianceEnforcementSettings().enforcementCompensatoryRest, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementCompensatoryRest },
    { key: AppSetting.COMPLIANCE_ENFORCEMENT_RESTRICTED_TIME_WINDOW, getCurrent: () => this.complianceEnforcementSettings().enforcementRestrictedTimeWindow, getOriginal: () => this.complianceEnforcementSettingsOriginal().enforcementRestrictedTimeWindow },
    { key: AppSetting.COMPLIANCE_ROSTER_PUBLICATION_MIN_LEAD_DAYS, getCurrent: () => this.complianceEnforcementSettings().rosterPublicationMinLeadDays.toString(), getOriginal: () => this.complianceEnforcementSettingsOriginal().rosterPublicationMinLeadDays.toString() },
    { key: AppSetting.COMPLIANCE_ROSTER_PUBLICATION_COUNT_WORKDAYS_ONLY, getCurrent: () => String(this.complianceEnforcementSettings().rosterPublicationCountWorkdaysOnly), getOriginal: () => String(this.complianceEnforcementSettingsOriginal().rosterPublicationCountWorkdaysOnly) },

    { key: AppSetting.ACTIVE_INDUSTRIES, getCurrent: () => serializeActiveIndustries(this.activeIndustriesSettings().activeIndustries), getOriginal: () => serializeActiveIndustries(this.activeIndustriesSettingsOriginal().activeIndustries) },
  ];

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    for (const definition of this.saveDefinitions) {
      this.saveSetting(definition.getCurrent(), definition.getOriginal(), definition.key);
    }
  }

  async saveImmediately(): Promise<void> {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.save();
    if (this.saveCounter === 0) {
      return;
    }
    await new Promise<void>((resolve) => this.saveCompletionResolvers.push(resolve));
  }

  private saveSetting(value: string, originalValue: string, type: string): void {
    if (value === originalValue) {
      return;
    }

    const existingSetting = this.settingsList.find((x) => x.type === type);

    if (existingSetting) {
      this.saveCounter++;
      existingSetting.value = value;
      this.dataSettingsService
        .updateSetting(existingSetting)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.saveCounter--;
          this.checkSaveComplete();
        });
    } else {
      const newSetting = new Setting();
      newSetting.value = value;
      newSetting.type = type;
      this.saveCounter++;
      this.dataSettingsService
        .addSetting(newSetting)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((savedSetting) => {
          this.settingsList.push(savedSetting);
          this.saveCounter--;
          this.checkSaveComplete();
        });
    }
  }

  private checkSaveComplete(): void {
    if (this.saveCounter === 0) {
      const resolvers = this.saveCompletionResolvers;
      this.saveCompletionResolvers = [];
      resolvers.forEach((resolve) => resolve());
      this.contactSettingsOriginal.set(cloneObject(this.contactSettings()));
      this.emailSettingsOriginal.set(cloneObject(this.emailSettings()));
      this.imapSettingsOriginal.set(cloneObject(this.imapSettings()));
      this.workSettingsOriginal.set(cloneObject(this.workSettings()));
      this.schedulingDefaultSettingsOriginal.set(cloneObject(this.schedulingDefaultSettings()));
      this.dataRetentionSettingsOriginal.set(cloneObject(this.dataRetentionSettings()));
      this.updateConfigSettingsOriginal.set(cloneObject(this.updateConfigSettings()));
      this.openRouteServiceApiKeyOriginal.set(this.openRouteServiceApiKey());
      this.deeplApiKeyOriginal.set(this.deeplApiKey());
      this.erpImportCronExpressionOriginal.set(this.erpImportCronExpression());
      this.erpImportCronTimeZoneOriginal.set(this.erpImportCronTimeZone());
      this.speechSettingsOriginal.set(cloneObject(this.speechSettings()));
      this.holisticHarmonizerSettingsOriginal.set(cloneObject(this.holisticHarmonizerSettings()));
      this.onCallSettingsOriginal.set(cloneObject(this.onCallSettings()));
      this.compensatoryRestSettingsOriginal.set(cloneObject(this.compensatoryRestSettings()));
      this.surchargeModeSettingsOriginal.set(cloneObject(this.surchargeModeSettings()));
      this.overtimeSettingsOriginal.set(cloneObject(this.overtimeSettings()));
      this.complianceEnforcementSettingsOriginal.set(cloneObject(this.complianceEnforcementSettings()));
      this.activeIndustriesSettingsOriginal.set(cloneObject(this.activeIndustriesSettings()));
    }
  }

  private checkIfDirty(): boolean {
    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();
    const imap = this.imapSettings();
    const imapOriginal = this.imapSettingsOriginal();
    const work = this.workSettings();
    const workOriginal = this.workSettingsOriginal();
    const sched = this.schedulingDefaultSettings();
    const schedOriginal = this.schedulingDefaultSettingsOriginal();
    const retention = this.dataRetentionSettings();
    const retentionOriginal = this.dataRetentionSettingsOriginal();

    return (
      !compareComplexObjects(contact, contactOriginal) ||
      !compareComplexObjects(email, emailOriginal) ||
      !compareComplexObjects(imap, imapOriginal) ||
      !compareComplexObjects(work, workOriginal) ||
      !compareComplexObjects(sched, schedOriginal) ||
      !compareComplexObjects(retention, retentionOriginal) ||
      !compareComplexObjects(this.updateConfigSettings(), this.updateConfigSettingsOriginal()) ||
      this.openRouteServiceApiKey() !== this.openRouteServiceApiKeyOriginal() ||
      this.deeplApiKey() !== this.deeplApiKeyOriginal() ||
      this.erpImportCronExpression() !== this.erpImportCronExpressionOriginal() ||
      this.erpImportCronTimeZone() !== this.erpImportCronTimeZoneOriginal() ||
      !compareComplexObjects(this.speechSettings(), this.speechSettingsOriginal()) ||
      !compareComplexObjects(this.holisticHarmonizerSettings(), this.holisticHarmonizerSettingsOriginal()) ||
      !compareComplexObjects(this.onCallSettings(), this.onCallSettingsOriginal()) ||
      !compareComplexObjects(this.compensatoryRestSettings(), this.compensatoryRestSettingsOriginal()) ||
      !compareComplexObjects(this.surchargeModeSettings(), this.surchargeModeSettingsOriginal()) ||
      !compareComplexObjects(this.overtimeSettings(), this.overtimeSettingsOriginal()) ||
      !compareComplexObjects(this.complianceEnforcementSettings(), this.complianceEnforcementSettingsOriginal()) ||
      !compareComplexObjects(this.activeIndustriesSettings(), this.activeIndustriesSettingsOriginal())
    );
  }

  resetData(): void {
    this.loadSettings();
  }
}
