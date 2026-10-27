// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { NEVER, Subject, of } from 'rxjs';
import { AppSettingsManagementService } from './app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { TtsProvider } from 'src/app/domain/constants/tts-provider.constants';
import { SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { HolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.model';
import { SCHEDULING_DEFAULT_MIN_REST_HOURS } from 'src/app/domain/constants/scheduling-policy-defaults.constants';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';

const RAW: Record<string, string> = {
  [AppSetting.APP_NAME]: 'c-name',
  [AppSetting.APP_ADDRESS_NAME]: 'c-address-name',
  [AppSetting.APP_ADDRESS_SUPPLEMENT]: 'c-supplement',
  [AppSetting.APP_ADDRESS_ADDRESS]: 'c-address',
  [AppSetting.APP_ADDRESS_ZIP]: 'c-zip',
  [AppSetting.APP_ADDRESS_PLACE]: 'c-place',
  [AppSetting.APP_ADDRESS_STATE]: 'c-state',
  [AppSetting.APP_ADDRESS_COUNTRY]: 'c-country',
  [AppSetting.APP_ADDRESS_TIMEZONE]: 'c-zone',
  [AppSetting.APP_ADDRESS_PHONE]: 'c-phone',
  [AppSetting.APP_ADDRESS_MAIL]: 'c-mail',
  [AppSetting.APP_ACCOUNTING_START]: '4',
  [AppSetting.APP_MARK]: 'c-mark',
  [AppSetting.GLOBAL_CALENDAR_COUNTRY]: 'c-cal-country',
  [AppSetting.GLOBAL_CALENDAR_STATE]: 'c-cal-state',
  [AppSetting.GLOBAL_CALENDAR_SELECTION_ID]: 'c-cal-selection',

  [AppSetting.APP_OUTGOING_SERVER]: 'e-server',
  [AppSetting.APP_OUTGOING_SERVER_PORT]: 'e-port',
  [AppSetting.APP_ENABLE_SSL]: 'e-ssl',
  [AppSetting.APP_OUTGOING_SERVER_TIMEOUT]: 'e-timeout',
  [AppSetting.APP_AUTHENTICATION_TYPE]: 'e-auth',
  [AppSetting.APP_READ_RECEIPT]: 'e-receipt',
  [AppSetting.APP_REPLY_TO]: 'e-reply',
  [AppSetting.APP_DISPOSITION_NOTIFICATION]: 'e-disposition',
  [AppSetting.APP_OUTGOING_SERVER_USERNAME]: 'e-user',
  [AppSetting.APP_OUTGOING_SERVER_PASSWORD]: 'e-password',

  [AppSetting.APP_INCOMING_SERVER]: 'i-server',
  [AppSetting.APP_INCOMING_SERVER_PORT]: 'i-port',
  [AppSetting.APP_INCOMING_SERVER_USERNAME]: 'i-user',
  [AppSetting.APP_INCOMING_SERVER_PASSWORD]: 'i-password',
  [AppSetting.APP_INCOMING_SERVER_SSL]: 'i-ssl',
  [AppSetting.APP_INCOMING_SERVER_FOLDER]: 'i-folder',
  [AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL]: 'i-poll',

  [AppSetting.OPENROUTESERVICE_API_KEY]: 'k-ors',
  [AppSetting.DEEPL_API_KEY]: 'k-deepl',
  [AppSetting.WEB_SEARCH_PROVIDER]: 'k-search-provider',
  [AppSetting.WEB_SEARCH_API_KEY]: 'k-search-key',
  [AppSetting.WEB_SEARCH_MAX_RESULTS]: '7',

  [AppSetting.ERP_IMPORT_CRON_EXPRESSION]: '0 5 * * *',
  [AppSetting.ERP_IMPORT_CRON_TIMEZONE]: 'zone-probe',

  [AppSetting.WORK_VACATION_DAYS_PER_YEAR]: '21',
  [AppSetting.WORK_PROBATION_PERIOD]: '4',
  [AppSetting.WORK_NOTICE_PERIOD]: '60',
  [AppSetting.WORK_PAYMENT_INTERVAL]: '1',
  [AppSetting.WORK_NIGHT_RATE]: '1.25',
  [AppSetting.WORK_HOLIDAY_RATE]: '1.5',
  [AppSetting.WORK_SA_RATE]: '1.1',
  [AppSetting.WORK_SO_RATE]: '1.2',
  [AppSetting.WORK_DAY_VISIBLE_BEFORE]: '5',
  [AppSetting.WORK_DAY_VISIBLE_AFTER]: '6',

  [AppSetting.WORK_DEFAULT_WORKING_HOURS]: '7.5',
  [AppSetting.WORK_OVERTIME_THRESHOLD]: '45',
  [AppSetting.WORK_GUARANTEED_HOURS]: '150',
  [AppSetting.WORK_MAXIMUM_HOURS]: '210',
  [AppSetting.WORK_MINIMUM_HOURS]: '120',
  [AppSetting.WORK_FULL_TIME]: '190',
  [AppSetting.SCHEDULING_MAX_WORK_DAYS]: '4',
  [AppSetting.SCHEDULING_MIN_REST_DAYS]: '3',
  [AppSetting.SCHEDULING_MIN_PAUSE_HOURS]: '9.5',
  [AppSetting.SCHEDULING_MAX_DAILY_SPAN_HOURS]: '13',
  [AppSetting.SCHEDULING_MAX_OPTIMAL_GAP]: '3',
  [AppSetting.SCHEDULING_MAX_DAILY_HOURS]: '9',
  [AppSetting.SCHEDULING_MAX_WEEKLY_HOURS]: '48',
  [AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS]: '7',

  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY]: 'false',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY]: 'false',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY]: 'false',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY]: 'false',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY]: 'false',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY]: 'true',
  [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY]: 'true',
  [AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK]: 'true',

  [AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE]: 'K-FREE',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY]: 'K-EARLY',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE]: 'K-LATE',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT]: 'K-NIGHT',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE]: 'K-NEG-FREE',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY]: 'K-NEG-EARLY',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE]: 'K-NEG-LATE',
  [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT]: 'K-NEG-NIGHT',

  [AppSetting.DATA_RETENTION_DAYS]: '365',

  [AppSetting.ASSISTANT_STT_ENGINE]: 's-engine',
  [AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM]: 's-key-deepgram',
  [AppSetting.ASSISTANT_STT_API_KEY_GROQ]: 's-key-groq',
  [AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI]: 's-key-assembly',
  [AppSetting.ASSISTANT_TTS_VOICE]: 's-voice',
  [AppSetting.ASSISTANT_TTS_PROVIDER]: 's-provider',
  [AppSetting.ASSISTANT_TTS_API_KEY_OPENAI]: 's-key-openai',
  [AppSetting.ASSISTANT_TTS_API_KEY_ELEVENLABS]: 's-key-eleven',
  [AppSetting.ASSISTANT_TTS_API_KEY_GOOGLE]: 's-key-google',
  [AppSetting.ASSISTANT_TRANSCRIPTION_MODEL]: 's-model',
  [AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT]: 's-prompt',
  [AppSetting.ASSISTANT_ENHANCEMENT_ENABLED]: 'false',
  [AppSetting.ASSISTANT_OUTPUT_MODE]: 's-output',
  [AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS]: '1500',
  [AppSetting.ASSISTANT_BARGE_IN_ENABLED]: 'true',

  [AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL]: 'h-model',
  [AppSetting.HOLISTIC_HARMONIZER_MODE]: 'llm',

  [AppSetting.UPDATE_AUTO_ENABLED]: 'true',
  [AppSetting.UPDATE_CHANNEL]: 'Beta',
  [AppSetting.UPDATE_CHECK_INTERVAL_HOURS]: '12',
  [AppSetting.UPDATE_MAINTENANCE_WINDOW_START]: '01:00',
  [AppSetting.UPDATE_MAINTENANCE_WINDOW_END]: '03:00',
  [AppSetting.UPDATE_NOTIFY_ONLY]: 'true',
  [AppSetting.UPDATE_BACKUP_RETENTION_COUNT]: '5',
  [AppSetting.UPDATE_PINNED_VERSION]: '1.2.3',
  [AppSetting.CALENDAR_WEEKEND_DAYS]: 'Friday,Saturday',
  [AppSetting.CALENDAR_WEEK_START_DAY]: 'Sunday',

  [AppSetting.COMPLIANCE_COMPENSATORY_REST_ENABLED]: 'true',
  [AppSetting.COMPLIANCE_COMPENSATORY_REST_DEADLINE_DAYS]: '14',
  [AppSetting.WORK_WE3_RATE]: '1.3',
  [AppSetting.SURCHARGE_NIGHT_RATE_MODE]: 'fixedperhour',
  [AppSetting.SURCHARGE_HOLIDAY_RATE_MODE]: 'fixedpershift',
  [AppSetting.SURCHARGE_WE1_RATE_MODE]: 'fixedperhour',
  [AppSetting.SURCHARGE_WE2_RATE_MODE]: 'fixedpershift',
  [AppSetting.SURCHARGE_WE3_RATE_MODE]: 'fixedperhour',
  [AppSetting.SURCHARGE_NIGHT_MINIMUM_PER_HOUR]: '2.5',
  [AppSetting.SURCHARGE_HOLIDAY_MINIMUM_PER_HOUR]: '3.5',
  [AppSetting.SURCHARGE_WE1_MINIMUM_PER_HOUR]: '4.5',
  [AppSetting.SURCHARGE_WE2_MINIMUM_PER_HOUR]: '5.5',
  [AppSetting.SURCHARGE_WE3_MINIMUM_PER_HOUR]: '6.5',
  [AppSetting.SURCHARGE_NIGHT_START]: '22:00',
  [AppSetting.SURCHARGE_NIGHT_END]: '05:00',
  [AppSetting.SURCHARGE_STACKING_MODE]: 'additive',

  [AppSetting.OVERTIME_BASIS]: 'week',
  [AppSetting.OVERTIME_RATE_MODE]: 'fixedperhour',
  [AppSetting.OVERTIME_TIER1_AFTER_HOURS]: '8',
  [AppSetting.OVERTIME_TIER1_RATE]: '1.25',
  [AppSetting.OVERTIME_TIER2_AFTER_HOURS]: '10',
  [AppSetting.OVERTIME_TIER2_RATE]: '1.5',
  [AppSetting.OVERTIME_TIER3_AFTER_HOURS]: '12',
  [AppSetting.OVERTIME_TIER3_RATE]: '2',

  [AppSetting.COMPLIANCE_ENFORCEMENT_DEFAULT_MODE]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_ALLOW_SUPERVISOR_OVERRIDE]: 'false',
  [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_DAILY_HOURS]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_WEEKLY_HOURS]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_HOURS]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_MIN_REST_DAYS]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_MAX_CONSECUTIVE_DAYS]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_PERIOD_CAP]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_ROLLING_AVERAGE]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_REST_DAY_ROTATION]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_COUNTER_RULE]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_COMPENSATORY_REST]: 'block',
  [AppSetting.COMPLIANCE_ENFORCEMENT_RESTRICTED_TIME_WINDOW]: 'warn',
  [AppSetting.COMPLIANCE_ENFORCEMENT_HOLIDAY_WORK]: 'block',
  [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_MIN_LEAD_DAYS]: '14',
  [AppSetting.COMPLIANCE_ROSTER_PUBLICATION_COUNT_WORKDAYS_ONLY]: 'true',
  [AppSetting.PLANNING_DEADLINE_LEAD_DAYS]: '10',

  [AppSetting.ACTIVE_INDUSTRIES]: 'security',
};

const GROUP_SIGNALS = [
  'contactSettings',
  'emailSettings',
  'imapSettings',
  'workSettings',
  'schedulingDefaultSettings',
  'dataRetentionSettings',
  'updateConfigSettings',
  'openRouteServiceApiKey',
  'deeplApiKey',
  'webSearchProvider',
  'webSearchApiKey',
  'webSearchMaxResults',
  'erpImportCronExpression',
  'erpImportCronTimeZone',
  'speechSettings',
  'holisticHarmonizerSettings',
  'compensatoryRestSettings',
  'surchargeModeSettings',
  'overtimeSettings',
  'complianceEnforcementSettings',
  'activeIndustriesSettings',
] as const;

function toSettingList(raw: Record<string, string>): ISetting[] {
  return Object.entries(raw).map(([type, value], index) => ({ id: `id-${index}`, type, value }));
}

function withEveryValue(value: string): Record<string, string> {
  return Object.fromEntries(Object.keys(RAW).map((key) => [key, value]));
}

describe('AppSettingsManagementService - setting mapping characterization', () => {
  let service: AppSettingsManagementService;
  let dataSettingsService: any;

  const readGroups = (): Record<string, unknown> =>
    Object.fromEntries(GROUP_SIGNALS.map((name) => [name, structuredClone((service as any)[name]())]));

  const load = (raw: Record<string, string>): void => {
    dataSettingsService.readSettingList.mockReturnValue(of(toSettingList(raw)));
    service.loadSettings();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    dataSettingsService = {
      readSettingList: vi.fn().mockReturnValue(of([])),
      updateSetting: vi.fn().mockReturnValue(NEVER),
      addSetting: vi.fn().mockReturnValue(NEVER),
    };

    TestBed.configureTestingModule({
      providers: [
        ...APP_PORT_BINDINGS,
        AppSettingsManagementService,
        { provide: DataSettingsVariousService, useValue: dataSettingsService },
        { provide: AuthorizationService, useValue: { isAdmin: true } },
      ],
    });

    service = TestBed.inject(AppSettingsManagementService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('covers every mapped setting key exactly once in the probe table', () => {
    expect(Object.keys(RAW)).toHaveLength(150);
  });

  it('maps every stored key onto its typed group field', () => {
    load(RAW);

    expect(service.contactSettings()).toEqual({
      name: 'c-name', addressName: 'c-address-name', supplementAddress: 'c-supplement', address: 'c-address',
      zip: 'c-zip', place: 'c-place', state: 'c-state', country: 'c-country', timeZone: 'c-zone', phone: 'c-phone',
      email: 'c-mail', accountingStart: 4, mark: 'c-mark', globalCalendarCountry: 'c-cal-country',
      globalCalendarState: 'c-cal-state', globalCalendarSelectionId: 'c-cal-selection',
    });
    expect(service.emailSettings()).toEqual({
      outgoingServer: 'e-server', outgoingServerPort: 'e-port', enabledSSL: 'e-ssl', outgoingServerTimeout: 'e-timeout',
      authenticationType: 'e-auth', readReceipt: 'e-receipt', replyTo: 'e-reply', dispositionNotification: 'e-disposition',
      username: 'e-user', password: 'e-password',
    });
    expect(service.imapSettings()).toEqual({
      server: 'i-server', port: 'i-port', username: 'i-user', password: 'i-password', enableSSL: 'i-ssl',
      folder: 'i-folder', pollInterval: 'i-poll',
    });
    expect(service.workSettings()).toEqual({
      vacationDaysPerYear: 21, probationPeriod: 4, noticePeriod: 60, paymentInterval: 1, nightRate: 1.25,
      holidayRate: 1.5, saRate: 1.1, soRate: 1.2, dayVisibleBefore: 5, dayVisibleAfter: 6,
    });
    expect(service.schedulingDefaultSettings()).toEqual({
      defaultWorkingHours: 7.5, overtimeThreshold: 45, guaranteedHours: 150, maximumHours: 210, minimumHours: 120,
      fullTime: 190, schedulingMaxWorkDays: 4, schedulingMinRestDays: 3, schedulingMinPauseHours: 9.5,
      schedulingMaxDailySpanHours: 13, schedulingMaxOptimalGap: 3, schedulingMaxDailyHours: 9,
      schedulingMaxWeeklyHours: 48, schedulingMaxConsecutiveDays: 7,
      workOnMonday: false, workOnTuesday: false, workOnWednesday: false, workOnThursday: false, workOnFriday: false,
      workOnSaturday: true, workOnSunday: true, performsShiftWork: true,
      weekendDays: ['Friday', 'Saturday'], weekStartDay: 'Sunday',
      commandKeywordFree: 'K-FREE', commandKeywordEarly: 'K-EARLY', commandKeywordLate: 'K-LATE',
      commandKeywordNight: 'K-NIGHT', commandKeywordNegFree: 'K-NEG-FREE', commandKeywordNegEarly: 'K-NEG-EARLY',
      commandKeywordNegLate: 'K-NEG-LATE', commandKeywordNegNight: 'K-NEG-NIGHT',
    });
    expect(service.dataRetentionSettings()).toEqual({ dataRetentionDays: 365 });
    expect(service.updateConfigSettings()).toEqual({
      autoEnabled: true, channel: 'Beta', checkIntervalHours: 12, maintenanceWindowStart: '01:00',
      maintenanceWindowEnd: '03:00', notifyOnly: true, backupRetentionCount: 5, pinnedVersion: '1.2.3',
    });
    expect(service.openRouteServiceApiKey()).toBe('k-ors');
    expect(service.deeplApiKey()).toBe('k-deepl');
    expect(service.webSearchProvider()).toBe('k-search-provider');
    expect(service.webSearchApiKey()).toBe('k-search-key');
    expect(service.webSearchMaxResults()).toBe('7');
    expect(service.erpImportCronExpression()).toBe('0 5 * * *');
    expect(service.erpImportCronTimeZone()).toBe('zone-probe');
    expect(service.speechSettings()).toEqual({
      sttEngine: 's-engine',
      sttApiKeys: {
        [SttEngine.Deepgram]: 's-key-deepgram',
        [SttEngine.GroqWhisper]: 's-key-groq',
        [SttEngine.AssemblyAi]: 's-key-assembly',
      },
      ttsVoice: 's-voice',
      ttsProvider: 's-provider',
      ttsApiKeys: {
        [TtsProvider.OpenAi]: 's-key-openai',
        [TtsProvider.ElevenLabs]: 's-key-eleven',
        [TtsProvider.Google]: 's-key-google',
      },
      transcriptionModel: 's-model',
      transcriptionPrompt: 's-prompt',
      enhancementEnabled: false,
      outputMode: 's-output',
      silenceThresholdMs: 1500,
      bargeInEnabled: true,
    });
    expect(service.holisticHarmonizerSettings()).toEqual({ mode: 'llm', llmModelId: 'h-model' });
    expect(service.compensatoryRestSettings()).toEqual({ compensatoryRestEnabled: true, compensatoryRestDeadlineDays: 14 });
    expect(service.surchargeModeSettings()).toEqual({
      we3Rate: 1.3, nightRateMode: 'fixedperhour', holidayRateMode: 'fixedpershift', we1RateMode: 'fixedperhour',
      we2RateMode: 'fixedpershift', we3RateMode: 'fixedperhour', nightMinimumPerHour: 2.5, holidayMinimumPerHour: 3.5,
      we1MinimumPerHour: 4.5, we2MinimumPerHour: 5.5, we3MinimumPerHour: 6.5, nightStart: '22:00', nightEnd: '05:00',
      stackingMode: 'additive',
    });
    expect(service.overtimeSettings()).toEqual({
      overtimeBasis: 'week', overtimeRateMode: 'fixedperhour', overtimeTier1AfterHours: 8, overtimeTier1Rate: 1.25,
      overtimeTier2AfterHours: 10, overtimeTier2Rate: 1.5, overtimeTier3AfterHours: 12, overtimeTier3Rate: 2,
    });
    expect(service.complianceEnforcementSettings()).toEqual({
      enforcementDefaultMode: 'block', enforcementAllowSupervisorOverride: false,
      enforcementMaxDailyHours: 'warn', enforcementMaxWeeklyHours: 'block', enforcementMinRestHours: 'warn',
      enforcementMinRestDays: 'block', enforcementMaxConsecutiveDays: 'warn', enforcementPeriodCap: 'block',
      enforcementRollingAverage: 'warn', enforcementRestDayRotation: 'block', enforcementCounterRule: 'warn',
      enforcementCompensatoryRest: 'block', enforcementRestrictedTimeWindow: 'warn', enforcementHolidayWork: 'block',
      rosterPublicationMinLeadDays: 14, rosterPublicationCountWorkdaysOnly: true, planningDeadlineLeadDays: 10,
    });
    expect(service.activeIndustriesSettings()).toEqual({ activeIndustry: 'security' });
    expect(service.isDirty()).toBe(false);
  });

  it('applies the documented fallbacks when every stored value is empty', () => {
    load(withEveryValue(''));

    expect(service.contactSettings().accountingStart).toBe(0);
    expect(service.imapSettings()).toEqual({
      server: '', port: '', username: '', password: '', enableSSL: '', folder: '', pollInterval: '',
    });
    expect(service.workSettings()).toEqual({
      vacationDaysPerYear: 25, probationPeriod: 3, noticePeriod: 30, paymentInterval: 2, nightRate: 0,
      holidayRate: 0, saRate: 0, soRate: 0, dayVisibleBefore: 3, dayVisibleAfter: 3,
    });
    expect(service.schedulingDefaultSettings()).toEqual({
      defaultWorkingHours: 8.5, overtimeThreshold: 42, guaranteedHours: 0, maximumHours: 0, minimumHours: 0,
      fullTime: 0, schedulingMaxWorkDays: 5, schedulingMinRestDays: 2,
      schedulingMinPauseHours: SCHEDULING_DEFAULT_MIN_REST_HOURS, schedulingMaxDailySpanHours: 0,
      schedulingMaxOptimalGap: 2, schedulingMaxDailyHours: 10, schedulingMaxWeeklyHours: 50,
      schedulingMaxConsecutiveDays: 6,
      workOnMonday: false, workOnTuesday: false, workOnWednesday: false, workOnThursday: false, workOnFriday: false,
      workOnSaturday: false, workOnSunday: false, performsShiftWork: false,
      weekendDays: ['Saturday', 'Sunday'], weekStartDay: 'Monday',
      commandKeywordFree: 'FREE', commandKeywordEarly: 'EARLY', commandKeywordLate: 'LATE',
      commandKeywordNight: 'NIGHT', commandKeywordNegFree: '-FREE', commandKeywordNegEarly: '-EARLY',
      commandKeywordNegLate: '-LATE', commandKeywordNegNight: '-NIGHT',
    });
    expect(service.dataRetentionSettings()).toEqual({ dataRetentionDays: 3650 });
    expect(service.updateConfigSettings()).toEqual({
      autoEnabled: false, channel: 'Stable', checkIntervalHours: 6, maintenanceWindowStart: '',
      maintenanceWindowEnd: '', notifyOnly: false, backupRetentionCount: 3, pinnedVersion: '',
    });
    expect(service.erpImportCronExpression()).toBe(ErpImportScheduleDefaults.CronExpression);
    expect(service.erpImportCronTimeZone()).toBe('');
    expect(service.speechSettings().silenceThresholdMs).toBe(new SpeechSettings().silenceThresholdMs);
    expect(service.speechSettings().enhancementEnabled).toBe(false);
    expect(service.holisticHarmonizerSettings()).toEqual({ ...new HolisticHarmonizerSettings(), llmModelId: '' });
    expect(service.compensatoryRestSettings()).toEqual({ compensatoryRestEnabled: false, compensatoryRestDeadlineDays: 0 });
    expect(service.surchargeModeSettings()).toEqual({
      we3Rate: 0, nightRateMode: 'multiplier', holidayRateMode: 'multiplier', we1RateMode: 'multiplier',
      we2RateMode: 'multiplier', we3RateMode: 'multiplier', nightMinimumPerHour: null, holidayMinimumPerHour: null,
      we1MinimumPerHour: null, we2MinimumPerHour: null, we3MinimumPerHour: null, nightStart: '23:00', nightEnd: '06:00',
      stackingMode: 'highestwins',
    });
    expect(service.overtimeSettings()).toEqual({
      overtimeBasis: 'day', overtimeRateMode: 'multiplier', overtimeTier1AfterHours: null, overtimeTier1Rate: null,
      overtimeTier2AfterHours: null, overtimeTier2Rate: null, overtimeTier3AfterHours: null, overtimeTier3Rate: null,
    });
    expect(service.complianceEnforcementSettings()).toEqual({
      enforcementDefaultMode: 'warn', enforcementAllowSupervisorOverride: false,
      enforcementMaxDailyHours: '', enforcementMaxWeeklyHours: '', enforcementMinRestHours: '',
      enforcementMinRestDays: '', enforcementMaxConsecutiveDays: '', enforcementPeriodCap: '',
      enforcementRollingAverage: '', enforcementRestDayRotation: '', enforcementCounterRule: '',
      enforcementCompensatoryRest: '', enforcementRestrictedTimeWindow: '', enforcementHolidayWork: '',
      rosterPublicationMinLeadDays: 0, rosterPublicationCountWorkdaysOnly: false, planningDeadlineLeadDays: 0,
    });
    expect(service.activeIndustriesSettings()).toEqual({ activeIndustry: '' });
  });

  it('applies the numeric fallbacks when stored values are not numbers', () => {
    load({
      [AppSetting.WORK_PAYMENT_INTERVAL]: '0',
      [AppSetting.WORK_DAY_VISIBLE_BEFORE]: '0',
      [AppSetting.WORK_DAY_VISIBLE_AFTER]: 'x',
      [AppSetting.WORK_VACATION_DAYS_PER_YEAR]: '0',
      [AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS]: '99999',
      [AppSetting.ACTIVE_INDUSTRIES]: '  retail  ',
      [AppSetting.HOLISTIC_HARMONIZER_MODE]: ' LLM ',
      [AppSetting.UPDATE_AUTO_ENABLED]: 'TRUE',
    });

    expect(service.workSettings().paymentInterval).toBe(0);
    expect(service.workSettings().dayVisibleBefore).toBe(0);
    expect(service.workSettings().dayVisibleAfter).toBe(3);
    expect(service.workSettings().vacationDaysPerYear).toBe(25);
    expect(service.speechSettings().silenceThresholdMs).toBe(3000);
    expect(service.activeIndustriesSettings().activeIndustry).toBe('retail');
    expect(service.holisticHarmonizerSettings().mode).toBe('llm');
    expect(service.updateConfigSettings().autoEnabled).toBe(true);
  });

  it('writes every changed group back under its own key with the canonical string value', () => {
    load(RAW);
    const loaded = readGroups();
    load({});
    for (const name of GROUP_SIGNALS) {
      (service as any)[name].set(structuredClone(loaded[name]));
    }

    service.save();

    const written = Object.fromEntries(
      dataSettingsService.addSetting.mock.calls.map(([setting]: [ISetting]) => [setting.type, setting.value])
    );
    expect(dataSettingsService.updateSetting).not.toHaveBeenCalled();
    expect(written).toEqual(RAW);
  });

  it('updates existing settings in place and keeps unchanged keys out of the save', () => {
    load(RAW);
    service.workSettings.update((s) => ({ ...s, nightRate: 2 }));
    service.overtimeSettings.update((s) => ({ ...s, overtimeTier2Rate: null }));

    service.save();

    const written = dataSettingsService.updateSetting.mock.calls.map(([setting]: [ISetting]) => [setting.type, setting.value]);
    expect(written).toEqual([
      [AppSetting.WORK_NIGHT_RATE, '2'],
      [AppSetting.OVERTIME_TIER2_RATE, ''],
    ]);
    expect(dataSettingsService.addSetting).not.toHaveBeenCalled();
  });

  it.each(GROUP_SIGNALS)('marks the store dirty when %s changes', (name) => {
    load(RAW);
    const groupSignal = (service as any)[name];
    const value = groupSignal();

    groupSignal.set(typeof value === 'string' ? `${value}-changed` : { ...structuredClone(value), probe: 1 });

    expect(service.isDirty()).toBe(true);
  });

  it('becomes clean for every group once all pending requests of the save succeeded', () => {
    load(RAW);
    const pending: Subject<unknown>[] = [];
    dataSettingsService.updateSetting.mockImplementation(() => {
      const request = new Subject<unknown>();
      pending.push(request);
      return request;
    });
    for (const name of GROUP_SIGNALS) {
      const groupSignal = (service as any)[name];
      const value = groupSignal();
      groupSignal.set(typeof value === 'string' ? `${value}-changed` : { ...structuredClone(value), probe: 1 });
    }

    service.save();
    expect(service.isDirty()).toBe(true);
    pending.forEach((request) => {
      request.next({});
      request.complete();
    });

    expect(pending).toHaveLength(7);
    expect(service.isDirty()).toBe(false);
  });
});
