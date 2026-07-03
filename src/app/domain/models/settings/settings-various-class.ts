// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISetting {
  id: string | undefined;
  type: string;
  value: string;
}

export class Setting implements ISetting {
  id = undefined;
  type = '';
  value = '';
}

export class AppSetting {
  public static APP_NAME = 'APP_NAME';
  public static APP_ADDRESS_NAME = 'APP_ADDRESS_NAME';
  public static APP_ADDRESS_SUPPLEMENT = 'APP_ADDRESS_SUPPLEMENT';
  public static APP_ADDRESS_ADDRESS = 'APP_ADDRESS_ADDRESS';
  public static APP_ADDRESS_ZIP = 'APP_ADDRESS_ZIP';
  public static APP_ADDRESS_PLACE = 'APP_ADDRESS_PLACE';
  public static APP_ADDRESS_STATE = 'APP_ADDRESS_STATE';
  public static APP_ADDRESS_COUNTRY = 'APP_ADDRESS_COUNTRY';
  public static APP_ADDRESS_TIMEZONE = 'APP_ADDRESS_TIMEZONE';
  public static APP_ADDRESS_PHONE = 'APP_ADDRESS_PHONE';
  public static APP_ADDRESS_MAIL = 'APP_ADDRESS_MAIL';
  public static APP_ACCOUNTING_START = 'APP_ACCOUNTING_START';

  public static APP_AUTHENTICATION_TYPE = 'authenticationType';
  public static APP_ENABLE_SSL = 'enabledSSL';
  public static APP_DISPOSITION_NOTIFICATION = 'dispositionNotification';
  public static APP_REPLY_TO = 'replyTo';
  public static APP_OUTGOING_SERVER = 'outgoingserver';
  public static APP_OUTGOING_SERVER_TIMEOUT = 'outgoingserverTimeout';
  public static APP_READ_RECEIPT = 'readReceipt';
  public static APP_MARK = 'mark';
  public static APP_OUTGOING_SERVER_PORT = 'outgoingserverPort';
  public static APP_OUTGOING_SERVER_USERNAME = 'outgoingserverUsername';
  public static APP_OUTGOING_SERVER_PASSWORD = 'outgoingserverPassword';

  public static APP_INCOMING_SERVER = 'incomingserver';
  public static APP_INCOMING_SERVER_PORT = 'incomingserverPort';
  public static APP_INCOMING_SERVER_USERNAME = 'incomingserverUsername';
  public static APP_INCOMING_SERVER_PASSWORD = 'incomingserverPassword';
  public static APP_INCOMING_SERVER_SSL = 'incomingserverSSL';
  public static APP_INCOMING_SERVER_FOLDER = 'incomingserverFolder';
  public static APP_INCOMING_SERVER_POLL_INTERVAL = 'incomingserverPollInterval';

  public static OPENROUTESERVICE_API_KEY = 'OPENROUTESERVICE_API_KEY';
  public static DEEPL_API_KEY = 'DEEPL_API_KEY';

  public static ERP_IMPORT_CRON_EXPRESSION = 'ERP_IMPORT_CRON_EXPRESSION';
  public static ERP_IMPORT_CRON_TIMEZONE = 'ERP_IMPORT_CRON_TIMEZONE';

  public static WORK_DEFAULT_WORKING_HOURS = 'defaultWorkingHours';
  public static WORK_OVERTIME_THRESHOLD = 'overtimeThreshold';
  public static WORK_VACATION_DAYS_PER_YEAR = 'vacationDaysPerYear';
  public static WORK_PROBATION_PERIOD = 'probationPeriod';
  public static WORK_NOTICE_PERIOD = 'noticePeriod';
  public static WORK_PAYMENT_INTERVAL = 'paymentInterval';
  public static WORK_GUARANTEED_HOURS = 'guaranteedHours';
  public static WORK_MAXIMUM_HOURS = 'maximumHours';
  public static WORK_MINIMUM_HOURS = 'minimumHours';
  public static WORK_FULL_TIME = 'fullTime';
  public static WORK_NIGHT_RATE = 'nightRate';
  public static WORK_HOLIDAY_RATE = 'holidayRate';
  public static WORK_SA_RATE = 'saRate';
  public static WORK_SO_RATE = 'soRate';
  public static WORK_DAY_VISIBLE_BEFORE = 'dayVisibleBefore';
  public static WORK_DAY_VISIBLE_AFTER = 'dayVisibleAfter';

  public static SCHEDULING_MAX_WORK_DAYS = 'SCHEDULING_MAX_WORK_DAYS';
  public static SCHEDULING_MIN_REST_DAYS = 'SCHEDULING_MIN_REST_DAYS';
  public static SCHEDULING_MIN_PAUSE_HOURS = 'SCHEDULING_MIN_PAUSE_HOURS';
  public static SCHEDULING_MAX_OPTIMAL_GAP = 'SCHEDULING_MAX_OPTIMAL_GAP';
  public static SCHEDULING_MAX_DAILY_HOURS = 'SCHEDULING_MAX_DAILY_HOURS';
  public static SCHEDULING_MAX_WEEKLY_HOURS = 'SCHEDULING_MAX_WEEKLY_HOURS';
  public static SCHEDULING_MAX_CONSECUTIVE_DAYS = 'SCHEDULING_MAX_CONSECUTIVE_DAYS';

  public static SCHEDULING_DEFAULT_WORK_ON_MONDAY = 'SCHEDULING_DEFAULT_WORK_ON_MONDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_TUESDAY = 'SCHEDULING_DEFAULT_WORK_ON_TUESDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY = 'SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_THURSDAY = 'SCHEDULING_DEFAULT_WORK_ON_THURSDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_FRIDAY = 'SCHEDULING_DEFAULT_WORK_ON_FRIDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_SATURDAY = 'SCHEDULING_DEFAULT_WORK_ON_SATURDAY';
  public static SCHEDULING_DEFAULT_WORK_ON_SUNDAY = 'SCHEDULING_DEFAULT_WORK_ON_SUNDAY';
  public static SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK = 'SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK';

  public static SCHEDULE_COMMAND_KEYWORD_FREE = 'SCHEDULE_COMMAND_KEYWORD_FREE';
  public static SCHEDULE_COMMAND_KEYWORD_EARLY = 'SCHEDULE_COMMAND_KEYWORD_EARLY';
  public static SCHEDULE_COMMAND_KEYWORD_LATE = 'SCHEDULE_COMMAND_KEYWORD_LATE';
  public static SCHEDULE_COMMAND_KEYWORD_NIGHT = 'SCHEDULE_COMMAND_KEYWORD_NIGHT';
  public static SCHEDULE_COMMAND_KEYWORD_NEG_FREE = 'SCHEDULE_COMMAND_KEYWORD_NEG_FREE';
  public static SCHEDULE_COMMAND_KEYWORD_NEG_EARLY = 'SCHEDULE_COMMAND_KEYWORD_NEG_EARLY';
  public static SCHEDULE_COMMAND_KEYWORD_NEG_LATE = 'SCHEDULE_COMMAND_KEYWORD_NEG_LATE';
  public static SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT = 'SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT';

  public static DATA_RETENTION_DAYS = 'DATA_RETENTION_DAYS';

  public static REPORT_DEFAULT_TEMPLATES = 'REPORT_DEFAULT_TEMPLATES';

  public static GLOBAL_CALENDAR_COUNTRY = 'globalCalendarCountry';
  public static GLOBAL_CALENDAR_STATE = 'globalCalendarState';
  public static GLOBAL_CALENDAR_SELECTION_ID = 'globalCalendarSelectionId';

  public static ASSISTANT_STT_ENGINE = 'ASSISTANT_STT_ENGINE';
  public static ASSISTANT_STT_API_KEY = 'ASSISTANT_STT_API_KEY';
  public static ASSISTANT_STT_API_KEY_DEEPGRAM = 'ASSISTANT_STT_API_KEY_DEEPGRAM';
  public static ASSISTANT_STT_API_KEY_GROQ = 'ASSISTANT_STT_API_KEY_GROQ';
  public static ASSISTANT_STT_API_KEY_ASSEMBLYAI = 'ASSISTANT_STT_API_KEY_ASSEMBLYAI';
  public static ASSISTANT_TTS_VOICE = 'ASSISTANT_TTS_VOICE';
  public static ASSISTANT_TTS_PROVIDER = 'ASSISTANT_TTS_PROVIDER';
  public static ASSISTANT_TTS_API_KEY_OPENAI = 'ASSISTANT_TTS_API_KEY_OPENAI';
  public static ASSISTANT_TTS_API_KEY_ELEVENLABS = 'ASSISTANT_TTS_API_KEY_ELEVENLABS';
  public static ASSISTANT_TTS_API_KEY_GOOGLE = 'ASSISTANT_TTS_API_KEY_GOOGLE';
  public static ASSISTANT_TRANSCRIPTION_MODEL = 'ASSISTANT_TRANSCRIPTION_MODEL';
  public static ASSISTANT_TRANSCRIPTION_PROMPT = 'ASSISTANT_TRANSCRIPTION_PROMPT';
  public static ASSISTANT_ENHANCEMENT_ENABLED = 'ASSISTANT_ENHANCEMENT_ENABLED';
  public static ASSISTANT_OUTPUT_MODE = 'ASSISTANT_OUTPUT_MODE';
  public static ASSISTANT_SILENCE_THRESHOLD_MS = 'ASSISTANT_SILENCE_THRESHOLD_MS';

  public static HOLISTIC_HARMONIZER_LLM_MODEL = 'WIZARD3_LLM_MODEL';

  public static UPDATE_AUTO_ENABLED = 'UPDATE_AUTO_ENABLED';
  public static UPDATE_CHANNEL = 'UPDATE_CHANNEL';
  public static UPDATE_CHECK_INTERVAL_HOURS = 'UPDATE_CHECK_INTERVAL_HOURS';
  public static UPDATE_MAINTENANCE_WINDOW_START = 'UPDATE_MAINTENANCE_WINDOW_START';
  public static UPDATE_MAINTENANCE_WINDOW_END = 'UPDATE_MAINTENANCE_WINDOW_END';
  public static UPDATE_NOTIFY_ONLY = 'UPDATE_NOTIFY_ONLY';
  public static UPDATE_BACKUP_RETENTION_COUNT = 'UPDATE_BACKUP_RETENTION_COUNT';
  public static UPDATE_PINNED_VERSION = 'UPDATE_PINNED_VERSION';
}

export interface IMacroType {
  id: string | undefined;

  name: string | undefined;

  isDefault: boolean | undefined;

  type: number;
}
