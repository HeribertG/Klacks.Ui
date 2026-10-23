// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Parses the flat key-value setting list of the GeneralSettings endpoint into the strongly typed settings groups.
 * Every known key has one parser that writes its stored string into its group field, applying the fallback of
 * that field for empty or unparsable values; unknown keys are ignored and leave the group defaults untouched.
 * @param settings - The stored settings as returned by the settings endpoint (type = key, value = raw string)
 */

import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { SettingsModels } from 'src/app/domain/models/settings/settings-models.interface';
import { SurchargeRateMode } from 'src/app/domain/models/settings/surcharge-rate-mode.type';
import { SurchargeStackingMode } from 'src/app/domain/models/settings/surcharge-stacking-mode.type';
import { OvertimeBasis } from 'src/app/domain/models/settings/overtime-basis.type';
import { OvertimeRateMode } from 'src/app/domain/models/settings/overtime-rate-mode.type';
import {
  ComplianceEnforcementDefaultMode,
} from 'src/app/domain/models/settings/compliance-enforcement-default-mode.type';
import { ComplianceEnforcementRuleMode } from 'src/app/domain/models/settings/compliance-enforcement-rule-mode.type';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { SpeechDefaults } from 'src/app/domain/constants/speech-defaults.constants';
import { parseHolisticHarmonizerMode } from 'src/app/domain/constants/holistic-harmonizer-mode.constants';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { sortDayNamesMondayFirst } from 'src/app/domain/constants/day-of-week.constants';
import { SCHEDULING_DEFAULT_MIN_REST_HOURS } from 'src/app/domain/constants/scheduling-policy-defaults.constants';
import { createDefaultSettingsModels } from 'src/app/domain/helpers/app-settings-models.helper';

/**
 * Normalizes the stored ACTIVE_INDUSTRIES value. The setting holds exactly one token going
 * forward (one industry slug or the custom-planning-rule sentinel); pre-existing multi-slug
 * values from the legacy checkbox-based UI are passed through untouched so the settings
 * card can detect and surface them, instead of silently collapsing them here.
 * @param value - The raw setting value as stored
 * @returns The trimmed value, or an empty string when the setting is unset
 */
function normalizeActiveIndustry(value: string): string {
  return (value ?? '').trim();
}

const APP_SETTING_PARSERS = new Map<string, (value: string, models: SettingsModels) => void>([
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
  [AppSetting.WEB_SEARCH_PROVIDER, (v, m) => (m.webSearchProvider = v)],
  [AppSetting.WEB_SEARCH_API_KEY, (v, m) => (m.webSearchApiKey = v)],
  [AppSetting.WEB_SEARCH_MAX_RESULTS, (v, m) => (m.webSearchMaxResults = v)],

  [AppSetting.ERP_IMPORT_CRON_EXPRESSION, (v, m) => (m.erpImportCronExpression = v || ErpImportScheduleDefaults.CronExpression)],
  [AppSetting.ERP_IMPORT_CRON_TIMEZONE, (v, m) => (m.erpImportCronTimeZone = v ?? ErpImportScheduleDefaults.UseCompanyTimeZone)],

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
  [AppSetting.SCHEDULING_MIN_PAUSE_HOURS, (v, m) => (m.schedulingDefaults.schedulingMinPauseHours = parseFloat(v) || SCHEDULING_DEFAULT_MIN_REST_HOURS)],
  [AppSetting.SCHEDULING_MAX_DAILY_SPAN_HOURS, (v, m) => (m.schedulingDefaults.schedulingMaxDailySpanHours = parseFloat(v) || 0)],
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
  [AppSetting.HOLISTIC_HARMONIZER_MODE, (v, m) => (m.holisticHarmonizer.mode = parseHolisticHarmonizerMode(v))],

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

  [AppSetting.COMPLIANCE_COMPENSATORY_REST_ENABLED, (v, m) => (m.compensatoryRest.compensatoryRestEnabled = v === 'true')],
  [AppSetting.COMPLIANCE_COMPENSATORY_REST_DEADLINE_DAYS, (v, m) => {
    const parsed = parseInt(v, 10);
    m.compensatoryRest.compensatoryRestDeadlineDays = Number.isNaN(parsed) ? 0 : parsed;
  }],
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
  [AppSetting.COMPLIANCE_ENFORCEMENT_HOLIDAY_WORK, (v, m) => (m.complianceEnforcement.enforcementHolidayWork = (v ?? '') as ComplianceEnforcementRuleMode)],
  [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_MIN_LEAD_DAYS, (v, m) => {
    const parsed = parseInt(v, 10);
    m.complianceEnforcement.rosterPublicationMinLeadDays = Number.isNaN(parsed) ? 0 : parsed;
  }],
  [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_COUNT_WORKDAYS_ONLY, (v, m) => (m.complianceEnforcement.rosterPublicationCountWorkdaysOnly = v === 'true')],
  [AppSetting.PLANNING_DEADLINE_LEAD_DAYS, (v, m) => {
    const parsed = parseInt(v, 10);
    m.complianceEnforcement.planningDeadlineLeadDays = Number.isNaN(parsed) ? 0 : parsed;
  }],

  [AppSetting.ACTIVE_INDUSTRIES, (v, m) => (m.activeIndustries.activeIndustry = normalizeActiveIndustry(v))],
]);

/**
 * Builds the typed settings groups from the stored setting list, starting from the group defaults.
 * @param settings - The stored settings; later entries of the same key overwrite earlier ones
 * @returns The populated settings groups
 */
export function parseSettingsModels(settings: ISetting[]): SettingsModels {
  const models = createDefaultSettingsModels();
  for (const setting of settings) {
    const parser = APP_SETTING_PARSERS.get(setting.type);
    if (parser) {
      parser(setting.value, models);
    }
  }
  return models;
}
