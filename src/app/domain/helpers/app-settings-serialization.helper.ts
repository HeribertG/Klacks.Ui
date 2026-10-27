// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Serializes the typed settings groups back into the stored string value of every GeneralSettings key, in the
 * order the app settings store saves them. Each entry maps one key to the string its current group field is
 * stored as, so the store can write only the keys whose string differs from the last loaded or saved state.
 * @param models - The settings groups to read the field from
 */

import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { AppSettingSerializer } from 'src/app/domain/models/settings/app-setting-serializer.interface';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';

/**
 * Serializes a nullable numeric setting into its stored string form.
 * @param value - The raw numeric value or null when the setting is unset
 * @returns Empty string for null, otherwise the number as an invariant string
 */
function serializeNullableNumber(value: number | null): string {
  return value === null ? '' : value.toString();
}

export const APP_SETTING_SERIALIZERS: readonly AppSettingSerializer[] = [
  { key: AppSetting.APP_NAME, serialize: (m) => m.contact.name },
  { key: AppSetting.APP_ADDRESS_NAME, serialize: (m) => m.contact.addressName },
  { key: AppSetting.APP_ADDRESS_SUPPLEMENT, serialize: (m) => m.contact.supplementAddress },
  { key: AppSetting.APP_ADDRESS_ADDRESS, serialize: (m) => m.contact.address },
  { key: AppSetting.APP_ADDRESS_ZIP, serialize: (m) => m.contact.zip },
  { key: AppSetting.APP_ADDRESS_PLACE, serialize: (m) => m.contact.place },
  { key: AppSetting.APP_ADDRESS_STATE, serialize: (m) => m.contact.state },
  { key: AppSetting.APP_ADDRESS_COUNTRY, serialize: (m) => m.contact.country },
  { key: AppSetting.APP_ADDRESS_TIMEZONE, serialize: (m) => m.contact.timeZone },
  { key: AppSetting.APP_ADDRESS_PHONE, serialize: (m) => m.contact.phone },
  { key: AppSetting.APP_ADDRESS_MAIL, serialize: (m) => m.contact.email },
  { key: AppSetting.APP_ACCOUNTING_START, serialize: (m) => m.contact.accountingStart.toString() },
  { key: AppSetting.APP_MARK, serialize: (m) => m.contact.mark },
  { key: AppSetting.GLOBAL_CALENDAR_COUNTRY, serialize: (m) => m.contact.globalCalendarCountry },
  { key: AppSetting.GLOBAL_CALENDAR_STATE, serialize: (m) => m.contact.globalCalendarState },
  { key: AppSetting.GLOBAL_CALENDAR_SELECTION_ID, serialize: (m) => m.contact.globalCalendarSelectionId },

  { key: AppSetting.APP_OUTGOING_SERVER, serialize: (m) => m.email.outgoingServer },
  { key: AppSetting.APP_OUTGOING_SERVER_PORT, serialize: (m) => m.email.outgoingServerPort },
  { key: AppSetting.APP_ENABLE_SSL, serialize: (m) => m.email.enabledSSL },
  { key: AppSetting.APP_OUTGOING_SERVER_TIMEOUT, serialize: (m) => m.email.outgoingServerTimeout },
  { key: AppSetting.APP_AUTHENTICATION_TYPE, serialize: (m) => m.email.authenticationType },
  { key: AppSetting.APP_READ_RECEIPT, serialize: (m) => m.email.readReceipt },
  { key: AppSetting.APP_REPLY_TO, serialize: (m) => m.email.replyTo },
  { key: AppSetting.APP_DISPOSITION_NOTIFICATION, serialize: (m) => m.email.dispositionNotification },
  { key: AppSetting.APP_OUTGOING_SERVER_USERNAME, serialize: (m) => m.email.username },
  { key: AppSetting.APP_OUTGOING_SERVER_PASSWORD, serialize: (m) => m.email.password },

  { key: AppSetting.APP_INCOMING_SERVER, serialize: (m) => m.imap.server },
  { key: AppSetting.APP_INCOMING_SERVER_PORT, serialize: (m) => m.imap.port },
  { key: AppSetting.APP_INCOMING_SERVER_USERNAME, serialize: (m) => m.imap.username },
  { key: AppSetting.APP_INCOMING_SERVER_PASSWORD, serialize: (m) => m.imap.password },
  { key: AppSetting.APP_INCOMING_SERVER_SSL, serialize: (m) => m.imap.enableSSL },
  { key: AppSetting.APP_INCOMING_SERVER_FOLDER, serialize: (m) => m.imap.folder },
  { key: AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL, serialize: (m) => m.imap.pollInterval },

  { key: AppSetting.WORK_VACATION_DAYS_PER_YEAR, serialize: (m) => m.work.vacationDaysPerYear.toString() },
  { key: AppSetting.WORK_PROBATION_PERIOD, serialize: (m) => m.work.probationPeriod.toString() },
  { key: AppSetting.WORK_NOTICE_PERIOD, serialize: (m) => m.work.noticePeriod.toString() },
  { key: AppSetting.WORK_PAYMENT_INTERVAL, serialize: (m) => m.work.paymentInterval.toString() },
  { key: AppSetting.WORK_NIGHT_RATE, serialize: (m) => m.work.nightRate.toString() },
  { key: AppSetting.WORK_HOLIDAY_RATE, serialize: (m) => m.work.holidayRate.toString() },
  { key: AppSetting.WORK_SA_RATE, serialize: (m) => m.work.saRate.toString() },
  { key: AppSetting.WORK_SO_RATE, serialize: (m) => m.work.soRate.toString() },
  { key: AppSetting.WORK_DAY_VISIBLE_BEFORE, serialize: (m) => m.work.dayVisibleBefore.toString() },
  { key: AppSetting.WORK_DAY_VISIBLE_AFTER, serialize: (m) => m.work.dayVisibleAfter.toString() },

  { key: AppSetting.WORK_DEFAULT_WORKING_HOURS, serialize: (m) => m.schedulingDefaults.defaultWorkingHours.toString() },
  { key: AppSetting.WORK_OVERTIME_THRESHOLD, serialize: (m) => m.schedulingDefaults.overtimeThreshold.toString() },
  { key: AppSetting.WORK_GUARANTEED_HOURS, serialize: (m) => m.schedulingDefaults.guaranteedHours.toString() },
  { key: AppSetting.WORK_MAXIMUM_HOURS, serialize: (m) => m.schedulingDefaults.maximumHours.toString() },
  { key: AppSetting.WORK_MINIMUM_HOURS, serialize: (m) => m.schedulingDefaults.minimumHours.toString() },
  { key: AppSetting.WORK_FULL_TIME, serialize: (m) => m.schedulingDefaults.fullTime.toString() },
  { key: AppSetting.SCHEDULING_MAX_WORK_DAYS, serialize: (m) => m.schedulingDefaults.schedulingMaxWorkDays.toString() },
  { key: AppSetting.SCHEDULING_MIN_REST_DAYS, serialize: (m) => m.schedulingDefaults.schedulingMinRestDays.toString() },
  { key: AppSetting.SCHEDULING_MIN_PAUSE_HOURS, serialize: (m) => m.schedulingDefaults.schedulingMinPauseHours.toString() },
  { key: AppSetting.SCHEDULING_MAX_DAILY_SPAN_HOURS, serialize: (m) => String(m.schedulingDefaults.schedulingMaxDailySpanHours ?? 0) },
  { key: AppSetting.SCHEDULING_MAX_OPTIMAL_GAP, serialize: (m) => m.schedulingDefaults.schedulingMaxOptimalGap.toString() },
  { key: AppSetting.SCHEDULING_MAX_DAILY_HOURS, serialize: (m) => m.schedulingDefaults.schedulingMaxDailyHours.toString() },
  { key: AppSetting.SCHEDULING_MAX_WEEKLY_HOURS, serialize: (m) => m.schedulingDefaults.schedulingMaxWeeklyHours.toString() },
  { key: AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS, serialize: (m) => m.schedulingDefaults.schedulingMaxConsecutiveDays.toString() },

  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY, serialize: (m) => m.schedulingDefaults.workOnMonday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY, serialize: (m) => m.schedulingDefaults.workOnTuesday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY, serialize: (m) => m.schedulingDefaults.workOnWednesday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY, serialize: (m) => m.schedulingDefaults.workOnThursday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY, serialize: (m) => m.schedulingDefaults.workOnFriday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY, serialize: (m) => m.schedulingDefaults.workOnSaturday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY, serialize: (m) => m.schedulingDefaults.workOnSunday.toString() },
  { key: AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK, serialize: (m) => m.schedulingDefaults.performsShiftWork.toString() },

  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE, serialize: (m) => m.schedulingDefaults.commandKeywordFree },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY, serialize: (m) => m.schedulingDefaults.commandKeywordEarly },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE, serialize: (m) => m.schedulingDefaults.commandKeywordLate },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT, serialize: (m) => m.schedulingDefaults.commandKeywordNight },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE, serialize: (m) => m.schedulingDefaults.commandKeywordNegFree },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY, serialize: (m) => m.schedulingDefaults.commandKeywordNegEarly },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE, serialize: (m) => m.schedulingDefaults.commandKeywordNegLate },
  { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT, serialize: (m) => m.schedulingDefaults.commandKeywordNegNight },

  { key: AppSetting.DATA_RETENTION_DAYS, serialize: (m) => m.dataRetention.dataRetentionDays.toString() },

  { key: AppSetting.OPENROUTESERVICE_API_KEY, serialize: (m) => m.openRouteServiceApiKey },
  { key: AppSetting.DEEPL_API_KEY, serialize: (m) => m.deeplApiKey },
  { key: AppSetting.WEB_SEARCH_PROVIDER, serialize: (m) => m.webSearchProvider },
  { key: AppSetting.WEB_SEARCH_API_KEY, serialize: (m) => m.webSearchApiKey },
  { key: AppSetting.WEB_SEARCH_MAX_RESULTS, serialize: (m) => m.webSearchMaxResults },

  { key: AppSetting.ERP_IMPORT_CRON_EXPRESSION, serialize: (m) => m.erpImportCronExpression },
  { key: AppSetting.ERP_IMPORT_CRON_TIMEZONE, serialize: (m) => m.erpImportCronTimeZone },

  { key: AppSetting.ASSISTANT_STT_ENGINE, serialize: (m) => m.speech.sttEngine },
  { key: AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM, serialize: (m) => m.speech.sttApiKeys[SttEngine.Deepgram] ?? '' },
  { key: AppSetting.ASSISTANT_STT_API_KEY_GROQ, serialize: (m) => m.speech.sttApiKeys[SttEngine.GroqWhisper] ?? '' },
  { key: AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI, serialize: (m) => m.speech.sttApiKeys[SttEngine.AssemblyAi] ?? '' },
  { key: AppSetting.ASSISTANT_TTS_VOICE, serialize: (m) => m.speech.ttsVoice },
  { key: AppSetting.ASSISTANT_TTS_PROVIDER, serialize: (m) => m.speech.ttsProvider },
  { key: AppSetting.ASSISTANT_TTS_API_KEY_OPENAI, serialize: (m) => m.speech.ttsApiKeys[TtsProvider.OpenAi] ?? '' },
  { key: AppSetting.ASSISTANT_TTS_API_KEY_ELEVENLABS, serialize: (m) => m.speech.ttsApiKeys[TtsProvider.ElevenLabs] ?? '' },
  { key: AppSetting.ASSISTANT_TTS_API_KEY_GOOGLE, serialize: (m) => m.speech.ttsApiKeys[TtsProvider.Google] ?? '' },
  { key: AppSetting.ASSISTANT_TRANSCRIPTION_MODEL, serialize: (m) => m.speech.transcriptionModel },
  { key: AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT, serialize: (m) => m.speech.transcriptionPrompt },
  { key: AppSetting.ASSISTANT_ENHANCEMENT_ENABLED, serialize: (m) => String(m.speech.enhancementEnabled) },
  { key: AppSetting.ASSISTANT_OUTPUT_MODE, serialize: (m) => m.speech.outputMode },
  { key: AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS, serialize: (m) => String(m.speech.silenceThresholdMs) },
  { key: AppSetting.ASSISTANT_BARGE_IN_ENABLED, serialize: (m) => String(m.speech.bargeInEnabled) },

  { key: AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL, serialize: (m) => m.holisticHarmonizer.llmModelId },
  { key: AppSetting.HOLISTIC_HARMONIZER_MODE, serialize: (m) => m.holisticHarmonizer.mode },

  { key: AppSetting.UPDATE_AUTO_ENABLED, serialize: (m) => String(m.update.autoEnabled) },
  { key: AppSetting.UPDATE_CHANNEL, serialize: (m) => m.update.channel },
  { key: AppSetting.UPDATE_CHECK_INTERVAL_HOURS, serialize: (m) => m.update.checkIntervalHours.toString() },
  { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_START, serialize: (m) => m.update.maintenanceWindowStart },
  { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_END, serialize: (m) => m.update.maintenanceWindowEnd },
  { key: AppSetting.UPDATE_NOTIFY_ONLY, serialize: (m) => String(m.update.notifyOnly) },
  { key: AppSetting.UPDATE_BACKUP_RETENTION_COUNT, serialize: (m) => m.update.backupRetentionCount.toString() },
  { key: AppSetting.UPDATE_PINNED_VERSION, serialize: (m) => m.update.pinnedVersion },

  { key: AppSetting.CALENDAR_WEEKEND_DAYS, serialize: (m) => m.schedulingDefaults.weekendDays.join(',') },
  { key: AppSetting.CALENDAR_WEEK_START_DAY, serialize: (m) => m.schedulingDefaults.weekStartDay },

  { key: AppSetting.COMPLIANCE_COMPENSATORY_REST_ENABLED, serialize: (m) => String(m.compensatoryRest.compensatoryRestEnabled) },
  { key: AppSetting.COMPLIANCE_COMPENSATORY_REST_DEADLINE_DAYS, serialize: (m) => m.compensatoryRest.compensatoryRestDeadlineDays.toString() },
  { key: AppSetting.WORK_WE3_RATE, serialize: (m) => m.surchargeMode.we3Rate.toString() },
  { key: AppSetting.SURCHARGE_NIGHT_RATE_MODE, serialize: (m) => m.surchargeMode.nightRateMode },
  { key: AppSetting.SURCHARGE_HOLIDAY_RATE_MODE, serialize: (m) => m.surchargeMode.holidayRateMode },
  { key: AppSetting.SURCHARGE_WE1_RATE_MODE, serialize: (m) => m.surchargeMode.we1RateMode },
  { key: AppSetting.SURCHARGE_WE2_RATE_MODE, serialize: (m) => m.surchargeMode.we2RateMode },
  { key: AppSetting.SURCHARGE_WE3_RATE_MODE, serialize: (m) => m.surchargeMode.we3RateMode },
  { key: AppSetting.SURCHARGE_NIGHT_MINIMUM_PER_HOUR, serialize: (m) => serializeNullableNumber(m.surchargeMode.nightMinimumPerHour) },
  { key: AppSetting.SURCHARGE_HOLIDAY_MINIMUM_PER_HOUR, serialize: (m) => serializeNullableNumber(m.surchargeMode.holidayMinimumPerHour) },
  { key: AppSetting.SURCHARGE_WE1_MINIMUM_PER_HOUR, serialize: (m) => serializeNullableNumber(m.surchargeMode.we1MinimumPerHour) },
  { key: AppSetting.SURCHARGE_WE2_MINIMUM_PER_HOUR, serialize: (m) => serializeNullableNumber(m.surchargeMode.we2MinimumPerHour) },
  { key: AppSetting.SURCHARGE_WE3_MINIMUM_PER_HOUR, serialize: (m) => serializeNullableNumber(m.surchargeMode.we3MinimumPerHour) },
  { key: AppSetting.SURCHARGE_NIGHT_START, serialize: (m) => m.surchargeMode.nightStart },
  { key: AppSetting.SURCHARGE_NIGHT_END, serialize: (m) => m.surchargeMode.nightEnd },
  { key: AppSetting.SURCHARGE_STACKING_MODE, serialize: (m) => m.surchargeMode.stackingMode },

  { key: AppSetting.OVERTIME_BASIS, serialize: (m) => m.overtime.overtimeBasis },
  { key: AppSetting.OVERTIME_RATE_MODE, serialize: (m) => m.overtime.overtimeRateMode },
  { key: AppSetting.OVERTIME_TIER1_AFTER_HOURS, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier1AfterHours) },
  { key: AppSetting.OVERTIME_TIER1_RATE, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier1Rate) },
  { key: AppSetting.OVERTIME_TIER2_AFTER_HOURS, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier2AfterHours) },
  { key: AppSetting.OVERTIME_TIER2_RATE, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier2Rate) },
  { key: AppSetting.OVERTIME_TIER3_AFTER_HOURS, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier3AfterHours) },
  { key: AppSetting.OVERTIME_TIER3_RATE, serialize: (m) => serializeNullableNumber(m.overtime.overtimeTier3Rate) },

  { key: AppSetting.COMPLIANCE_ENFORCEMENT_DEFAULT_MODE, serialize: (m) => m.complianceEnforcement.enforcementDefaultMode },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_ALLOW_SUPERVISOR_OVERRIDE, serialize: (m) => String(m.complianceEnforcement.enforcementAllowSupervisorOverride) },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_DAILY_HOURS, serialize: (m) => m.complianceEnforcement.enforcementMaxDailyHours },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_WEEKLY_HOURS, serialize: (m) => m.complianceEnforcement.enforcementMaxWeeklyHours },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_HOURS, serialize: (m) => m.complianceEnforcement.enforcementMinRestHours },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_DAYS, serialize: (m) => m.complianceEnforcement.enforcementMinRestDays },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_MAX_CONSECUTIVE_DAYS, serialize: (m) => m.complianceEnforcement.enforcementMaxConsecutiveDays },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_PERIOD_CAP, serialize: (m) => m.complianceEnforcement.enforcementPeriodCap },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_ROLLING_AVERAGE, serialize: (m) => m.complianceEnforcement.enforcementRollingAverage },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_REST_DAY_ROTATION, serialize: (m) => m.complianceEnforcement.enforcementRestDayRotation },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_COUNTER_RULE, serialize: (m) => m.complianceEnforcement.enforcementCounterRule },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_COMPENSATORY_REST, serialize: (m) => m.complianceEnforcement.enforcementCompensatoryRest },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_RESTRICTED_TIME_WINDOW, serialize: (m) => m.complianceEnforcement.enforcementRestrictedTimeWindow },
  { key: AppSetting.COMPLIANCE_ENFORCEMENT_HOLIDAY_WORK, serialize: (m) => m.complianceEnforcement.enforcementHolidayWork },
  { key: AppSetting.COMPLIANCE_ROSTER_PUBLICATION_MIN_LEAD_DAYS, serialize: (m) => m.complianceEnforcement.rosterPublicationMinLeadDays.toString() },
  { key: AppSetting.COMPLIANCE_ROSTER_PUBLICATION_COUNT_WORKDAYS_ONLY, serialize: (m) => String(m.complianceEnforcement.rosterPublicationCountWorkdaysOnly) },
  { key: AppSetting.PLANNING_DEADLINE_LEAD_DAYS, serialize: (m) => m.complianceEnforcement.planningDeadlineLeadDays.toString() },

  { key: AppSetting.ACTIVE_INDUSTRIES, serialize: (m) => m.activeIndustries.activeIndustry },
];
